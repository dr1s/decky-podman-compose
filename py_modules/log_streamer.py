import asyncio
import json
import os
import re
import shlex
from typing import Optional


MAX_LOG_LINES = 5000

# Strip ANSI/terminal escape sequences (color codes, cursor movement, OSC, etc.)
# from log lines. Covers CSI (ESC[...), OSC (ESC]...BEL or ESC]...ST), and
# single-byte Fe sequences (ESC @..Z, \, ^, _).
_ANSI_RE = re.compile(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)|[@-Z\\^_])")


class LogStreamer:
    def __init__(self):
        self._buffers: dict[str, dict] = {}
        self._tasks: dict[str, asyncio.Task] = {}

    def _ensure_buffer(self, stack_name: str):
        if stack_name not in self._buffers:
            self._buffers[stack_name] = {"base": 0, "lines": [], "proc": None}

    def _append_line(self, stack_name: str, line: str):
        buf = self._buffers.get(stack_name)
        if buf is None:
            return
        buf["lines"].append(line)
        while len(buf["lines"]) > MAX_LOG_LINES:
            buf["lines"].pop(0)
            buf["base"] += 1

    def get_lines(self, stack_name: str, after_index: int) -> dict:
        buf = self._buffers.get(stack_name)
        if buf is None:
            return {"lines": [], "next_index": 0}

        base = buf["base"]
        lines = buf["lines"]
        next_index = base + len(lines)

        start = max(0, after_index - base)
        result_lines = lines[start:]
        return {"lines": result_lines, "next_index": next_index}

    @staticmethod
    def _clean_env() -> dict[str, str]:
        # Avoid PyInstaller/Decky bundled libraries interfering with podman.
        return {k: v for k, v in os.environ.items() if k.upper() not in ("LD_LIBRARY_PATH", "LD_PRELOAD")}

    async def start(self, stack_name: str, stack_path: str, services: list = None) -> dict:
        import decky
        services = services or []
        await self.stop(stack_name)
        self._ensure_buffer(stack_name)

        try:
            # Discover container names first. podman-compose's `logs -f` can exit
            # immediately when run non-interactively; reading logs directly from
            # podman for each container is more reliable.
            ps_cmd = f"cd {shlex.quote(stack_path)} && podman compose ps --format json"
            ps_proc = await asyncio.create_subprocess_exec(
                "bash", "-lc", ps_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.DEVNULL,
                env=self._clean_env(),
            )
            ps_stdout, ps_stderr = await ps_proc.communicate()
            ps_out = ps_stdout.decode("utf-8", errors="replace")
            ps_err = ps_stderr.decode("utf-8", errors="replace")
            decky.logger.info(f"Podman Compose: ps exit={ps_proc.returncode} stdout={ps_out!r} stderr={ps_err!r}")
            names = []
            if ps_proc.returncode == 0 and ps_out.strip():
                try:
                    containers = json.loads(ps_out)
                    decky.logger.info(f"Podman Compose: parsed {len(containers)} containers")
                    for c in containers:
                        if not c.get("Names"):
                            continue
                        labels = c.get("Labels", {})
                        svc = labels.get("com.docker.compose.service") or labels.get("io.podman.compose.service")
                        if not services or svc in services:
                            names.append(c["Names"][0])
                except Exception as e:
                    decky.logger.warning(f"Podman Compose: failed to parse ps output for logs: {e}")

            if not names:
                return {"success": False, "message": f"No containers found to stream logs from (ps exit={ps_proc.returncode})"}

            shell_cmd = f"cd {shlex.quote(stack_path)} && podman logs -f --names {' '.join(shlex.quote(n) for n in names)}"
            decky.logger.info(f"Podman Compose: starting log stream: {shell_cmd}")
            proc = await asyncio.create_subprocess_exec(
                "bash", "-lc", shell_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                stdin=asyncio.subprocess.DEVNULL,
                env=self._clean_env(),
            )
        except FileNotFoundError:
            return {"success": False, "message": "podman not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

        self._buffers[stack_name]["proc"] = proc
        self._tasks[stack_name] = asyncio.create_task(self._read_loop(stack_name, proc))
        return {"success": True}

    async def _read_loop(self, stack_name: str, proc: asyncio.subprocess.Process):
        import decky
        try:
            pending = b""
            while True:
                chunk = await proc.stdout.read(4096)
                if not chunk:
                    break
                pending += chunk
                while b"\n" in pending:
                    line, pending = pending.split(b"\n", 1)
                    text = line.decode("utf-8", errors="replace").rstrip("\r")
                    text = _ANSI_RE.sub("", text)
                    decky.logger.info(f"Podman Compose: log line: {text[:200]}")
                    self._append_line(stack_name, text)
            if pending:
                text = pending.decode("utf-8", errors="replace").rstrip("\r")
                text = _ANSI_RE.sub("", text)
                decky.logger.info(f"Podman Compose: log line: {text[:200]}")
                self._append_line(stack_name, text)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            decky.logger.error(f"Podman Compose: log stream read error: {e}")
        finally:
            try:
                proc.terminate()
                await asyncio.wait_for(proc.wait(), timeout=2.0)
            except Exception:
                pass
            decky.logger.info(f"Podman Compose: log stream ended with exit code {proc.returncode}")
            if self._buffers.get(stack_name, {}).get("proc") is proc:
                self._buffers[stack_name]["proc"] = None

    async def stop(self, stack_name: str):
        task = self._tasks.pop(stack_name, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        buf = self._buffers.get(stack_name)
        if buf:
            proc = buf.get("proc")
            if proc:
                try:
                    proc.terminate()
                    await asyncio.wait_for(proc.wait(), timeout=2.0)
                except Exception:
                    pass
            buf["proc"] = None
            buf["lines"] = []
            buf["base"] = 0

    async def stop_all(self):
        for stack_name in list(self._tasks.keys()):
            await self.stop(stack_name)
