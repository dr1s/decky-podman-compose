import asyncio
import json
import os
import shlex
from typing import Optional

import decky

from py_modules.settings import SettingsStore


COMPOSE_FILENAMES = [
    "docker-compose.yml",
    "podman-compose.yml",
    "container-compose.yml",
]


class ComposeManager:
    def __init__(self, settings_store: SettingsStore):
        self._settings = settings_store
        self._stacks: dict[str, dict] = {}
        self._services_cache: dict[str, list[str]] = {}

    def scan_stacks(self) -> list[dict]:
        base_dir = self._settings.get_base_dir()
        stacks = []
        if not os.path.isdir(base_dir):
            self._stacks = {}
            return []

        for entry in os.listdir(base_dir):
            stack_path = os.path.realpath(os.path.join(base_dir, entry))
            if not os.path.isdir(stack_path):
                continue
            if not self._is_under_base(stack_path, base_dir):
                continue
            if self._has_compose_file(stack_path):
                stacks.append({
                    "name": entry,
                    "path": stack_path,
                })

        self._stacks = {s["name"]: s for s in stacks}
        self._services_cache.clear()
        return stacks

    @staticmethod
    def _is_under_base(path: str, base: str) -> bool:
        real_base = os.path.realpath(base)
        return path.startswith(real_base + os.sep) or path == real_base

    @staticmethod
    def _has_compose_file(stack_path: str) -> bool:
        return any(
            os.path.isfile(os.path.join(stack_path, filename))
            for filename in COMPOSE_FILENAMES
        )

    def get_stack(self, stack_name: str) -> Optional[dict]:
        return self._stacks.get(stack_name)

    def _get_stack(self, stack_name: str) -> Optional[dict]:
        return self.get_stack(stack_name)

    async def get_services(self, stack_name: str) -> list[str]:
        if stack_name in self._services_cache:
            return self._services_cache[stack_name]

        stack = self._get_stack(stack_name)
        if not stack:
            return []
        code, stdout, _stderr = await self._run(
            ["podman", "compose", "config", "--services"],
            stack["path"],
        )
        if code != 0:
            return []
        services = [line.strip() for line in stdout.splitlines() if line.strip()]
        self._services_cache[stack_name] = services
        return services

    async def get_status_detail(self, stack_name: str) -> dict:
        stack = self._get_stack(stack_name)
        if not stack:
            return {"status": "unknown", "services": []}

        services = await self.get_services(stack_name)
        code, stdout, _stderr = await self._run(
            ["podman", "compose", "ps", "--format", "json"],
            stack["path"],
        )
        if code != 0:
            return {"status": "unknown", "services": []}
        try:
            containers = json.loads(stdout)
        except json.JSONDecodeError:
            return {"status": "unknown", "services": []}

        container_by_service: dict[str, dict] = {}
        for c in containers:
            labels = c.get("Labels") or {}
            svc = labels.get("com.docker.compose.service")
            if not svc:
                name = c.get("Name", "")
                parts = name.split("_")
                if len(parts) >= 2:
                    svc = parts[-2]
            if svc:
                container_by_service[svc] = c

        service_statuses = []
        for svc in services:
            c = container_by_service.get(svc)
            if not c:
                service_statuses.append({
                    "name": svc,
                    "state": "not running",
                    "health": "",
                    "status": "not running",
                })
                continue
            state = c.get("State", "unknown").lower()
            exited = c.get("Exited", False)
            exit_code = c.get("ExitCode", -1)
            status_text = c.get("Status", "")
            status_lower = status_text.lower()
            health = ""
            if state == "running":
                if "unhealthy" in status_lower:
                    health = "unhealthy"
                elif "healthy" in status_lower:
                    health = "healthy"
                elif "starting" in status_lower:
                    health = "starting"
            elif exited and exit_code == 0:
                state = "completed"

            service_statuses.append({
                "name": svc,
                "state": state,
                "health": health,
                "status": status_text or state,
            })

        overall = self._aggregate_status(service_statuses)
        return {"status": overall, "services": service_statuses}

    @staticmethod
    def _aggregate_status(service_statuses: list[dict]) -> str:
        if not service_statuses:
            return "stopped"

        total = len(service_statuses)
        running = 0
        completed = 0
        created_count = 0
        healthy = 0
        unhealthy = 0
        starting = 0
        for s in service_statuses:
            state = s["state"]
            health = s["health"]
            if state == "running":
                running += 1
                if health == "unhealthy":
                    unhealthy += 1
                elif health == "healthy":
                    healthy += 1
                elif health == "starting":
                    starting += 1
            elif state == "completed":
                completed += 1
            elif state == "created":
                created_count += 1

        if running == total:
            if unhealthy > 0:
                return "unhealthy"
            elif starting > 0:
                return "starting"
            return "running"
        if running + completed == total:
            if unhealthy > 0:
                return "unhealthy"
            elif starting > 0:
                return "starting"
            return "running"
        if completed == total:
            return "completed"
        if created_count == total:
            return "created"
        if running > 0 or completed > 0:
            return "partial"
        if created_count > 0:
            return f"created ({created_count}/{total})"
        return "stopped"

    async def run_action(self, stack_name: str, action: str, services: Optional[list[str]] = None) -> dict:
        stack = self._get_stack(stack_name)
        if not stack:
            return {"success": False, "message": f"Stack not found: {stack_name}"}

        services = services or []
        cmd = ["podman", "compose"]

        if action == "up":
            cmd.extend(["--verbose", "up", "-d"])
            cmd.extend(services)
        elif action == "down":
            cmd.append("down")
            cmd.extend(services)
        elif action in ("start", "stop", "pull"):
            cmd.append(action)
            cmd.extend(services)
        else:
            return {"success": False, "message": f"Unknown action: {action}"}

        # Pulling large images can take much longer than start/stop/down.
        timeout = 600 if action == "pull" else 300 if action == "up" else 120

        decky.logger.info(f"Podman Compose: running command: {' '.join(cmd)} (cwd={stack['path']})")
        env = os.environ.copy()
        decky.logger.info(
            f"Podman Compose: command env: PATH={env.get('PATH', '')} "
            f"XDG_RUNTIME_DIR={env.get('XDG_RUNTIME_DIR', '')} "
            f"PODMAN_COMPOSE_PROVIDER={env.get('PODMAN_COMPOSE_PROVIDER', '')} "
            f"HOME={env.get('HOME', '')}"
        )
        code, stdout, stderr = await self._run(cmd, stack['path'], env, timeout=timeout)
        decky.logger.info(f"Podman Compose: command exit code: {code}")
        if stdout.strip():
            decky.logger.info(f"Podman Compose: stdout: {stdout.strip()}")
        if stderr.strip():
            decky.logger.info(f"Podman Compose: stderr: {stderr.strip()}")
        message = stdout.strip() if stdout.strip() else stderr.strip()
        if code != 0:
            decky.logger.error(f"Podman Compose: command failed: {' '.join(cmd)} (cwd={stack['path']})")
            if "looking up compose provider failed" in stderr.lower() or "compose provider" in stderr.lower():
                message = (
                    "No compose provider found. Install podman-compose or docker-compose. "
                    f"Original error: {message}"
                )
            return {"success": False, "message": message}

        return {"success": True, "message": message}

    async def _run(self, cmd: list[str], cwd: str, env: Optional[dict[str, str]] = None, timeout: int = 120) -> tuple[int, str, str]:
        if env is None:
            env = os.environ.copy()
        # The Decky Loader process may bundle libraries (e.g. PyInstaller's
        # /tmp/_MEI... directory in LD_LIBRARY_PATH) that conflict with system
        # libraries required by podman/systemd-run. Use the system's library
        # resolution for subprocesses.
        env = {k: v for k, v in env.items() if k.upper() not in ("LD_LIBRARY_PATH", "LD_PRELOAD")}
        try:
            # Run via bash -l to mimic an interactive terminal session as closely as
            # possible. Some compose providers misbehave when launched directly with
            # pipes and no shell context.
            inner = " ".join(shlex.quote(arg) for arg in cmd)
            shell_cmd = f"cd {shlex.quote(cwd)} && {inner}"

            proc = await asyncio.create_subprocess_exec(
                "bash", "-lc", shell_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.DEVNULL,
                env=env,
            )

            stdout_lines: list[str] = []
            stderr_lines: list[str] = []

            async def _read_stream(stream, collector):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    collector.append(line.decode("utf-8", errors="replace"))

            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        _read_stream(proc.stdout, stdout_lines),
                        _read_stream(proc.stderr, stderr_lines),
                        proc.wait(),
                    ),
                    timeout=timeout,
                )
                stdout = "".join(stdout_lines)
                stderr = "".join(stderr_lines)
                return (
                    proc.returncode or 0,
                    stdout,
                    stderr,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                stdout = "".join(stdout_lines)
                stderr = "".join(stderr_lines)
                return (
                    124,
                    stdout,
                    f"Command timed out after {timeout}s\n" + stderr,
                )
        except FileNotFoundError:
            return (1, "", f"Command not found: {cmd[0]}")
        except Exception as e:
            return (1, "", str(e))
