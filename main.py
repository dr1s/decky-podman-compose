import asyncio
import os
import sys

# Ensure py_modules is importable when Decky loads this plugin
_plugin_dir = os.path.dirname(os.path.abspath(__file__))
if _plugin_dir not in sys.path:
    sys.path.insert(0, _plugin_dir)

import decky

from py_modules.settings import SettingsStore
from py_modules.compose_manager import ComposeManager
from py_modules.log_streamer import LogStreamer


def _get_settings_dir() -> str:
    """Return a usable settings directory, falling back across Decky versions."""
    if hasattr(decky, "DECKY_SETTINGS_DIR") and decky.DECKY_SETTINGS_DIR:
        return decky.DECKY_SETTINGS_DIR
    if hasattr(decky, "DECKY_HOME") and decky.DECKY_HOME:
        return os.path.join(decky.DECKY_HOME, "settings", "decky-podman-compose")
    if hasattr(decky, "DECKY_USER_HOME") and decky.DECKY_USER_HOME:
        return os.path.join(decky.DECKY_USER_HOME, ".config", "decky-podman-compose")
    return os.path.expanduser("~/.config/decky-podman-compose")


class Plugin:
    async def _main(self):
        settings_dir = _get_settings_dir()
        decky.logger.info(f"Podman Compose: settings_dir={settings_dir}")
        # Decky does not source .profile; load the login shell environment so
        # PATH additions and variables like PODMAN_COMPOSE_WARNING_LOGS are seen.
        try:
            proc = await asyncio.create_subprocess_exec(
                "bash", "-lc", "env -0",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _stderr = await proc.communicate()
            env_text = stdout.decode("utf-8", errors="replace").strip("\x00")
            for line in env_text.split("\x00"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    # Preserve Decky's own env vars to avoid breaking the loader.
                    if key not in ("DECKY_PLUGIN_DIR", "DECKY_PLUGIN_NAME", "DECKY_PLUGIN_VERSION"):
                        os.environ[key] = value
            decky.logger.info("Podman Compose: loaded login shell environment")
        except Exception as e:
            decky.logger.warning(f"Podman Compose: failed to load login environment: {e}")

        # Rootless podman needs a runtime dir; ensure it is set in case the
        # plugin process was spawned without a full systemd user session.
        uid = os.getuid()
        runtime_dir = os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{uid}")
        os.environ["XDG_RUNTIME_DIR"] = runtime_dir
        if "DBUS_SESSION_BUS_ADDRESS" not in os.environ and os.path.isdir(runtime_dir):
            os.environ["DBUS_SESSION_BUS_ADDRESS"] = f"unix:path={runtime_dir}/bus"
        decky.logger.info(
            f"Podman Compose: XDG_RUNTIME_DIR={os.environ.get('XDG_RUNTIME_DIR')} "
            f"DBUS_SESSION_BUS_ADDRESS={os.environ.get('DBUS_SESSION_BUS_ADDRESS')}"
        )

        self.settings = SettingsStore(settings_dir)
        self.compose = ComposeManager(self.settings)
        self.logs = LogStreamer()
        decky.logger.info("Podman Compose plugin loaded")

    async def _unload(self):
        if hasattr(self, "logs") and self.logs:
            await self.logs.stop_all()
        decky.logger.info("Podman Compose plugin unloaded")

    async def _migration(self):
        user_home = getattr(decky, "DECKY_USER_HOME", None) or os.path.expanduser("~")
        decky_home = getattr(decky, "DECKY_HOME", None) or os.path.join(user_home, "homebrew")
        migrations = [
            ("migrate_logs", (
                os.path.join(user_home, ".config", "decky-podman-compose", "plugin.log"),
            )),
            ("migrate_settings", (
                os.path.join(decky_home, "settings", "decky-podman-compose.json"),
                os.path.join(user_home, ".config", "decky-podman-compose"),
            )),
            ("migrate_runtime", (
                os.path.join(decky_home, "decky-podman-compose"),
                os.path.join(user_home, ".local", "share", "decky-podman-compose"),
            )),
        ]
        for name, args in migrations:
            try:
                migrate = getattr(decky, name, None)
                if migrate is None:
                    decky.logger.warning(f"Podman Compose: migrate helper {name} not available")
                    continue
                migrate(*args)
                decky.logger.info(f"Podman Compose: {name} completed")
            except Exception as e:
                decky.logger.warning(f"Podman Compose: {name} failed: {e}")

    # Settings

    async def set_base_dir(self, path: str) -> dict:
        decky.logger.info(f"Podman Compose: set_base_dir called with path={path}")
        try:
            ok, msg = self.settings.set_base_dir(path)
            decky.logger.info(f"Podman Compose: set_base_dir result ok={ok} msg={msg}")
            if ok:
                self.compose.scan_stacks()
            return {"success": ok, "message": msg}
        except Exception as e:
            decky.logger.error(f"Podman Compose: set_base_dir exception: {e}")
            return {"success": False, "message": f"Internal error: {e}"}

    async def get_base_dir(self) -> str:
        try:
            return self.settings.get_base_dir()
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_base_dir exception: {e}")
            return ""

    async def list_directory(self, path: str) -> dict:
        try:
            expanded = os.path.expanduser(path)
            entries = []
            with os.scandir(expanded) as it:
                for entry in sorted(it, key=lambda e: e.name.lower()):
                    if entry.is_dir():
                        entries.append({"name": entry.name, "path": entry.path})
            return {"success": True, "entries": entries}
        except Exception as e:
            decky.logger.error(f"Podman Compose: list_directory exception: {e}")
            return {"success": False, "message": str(e)}

    async def get_selected_stack(self) -> str:
        try:
            return self.settings.get_selected_stack() or ""
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_selected_stack exception: {e}")
            return ""

    async def set_selected_stack(self, stack_name: str) -> dict:
        try:
            self.settings.set_selected_stack(stack_name)
            return {"success": True}
        except Exception as e:
            decky.logger.error(f"Podman Compose: set_selected_stack exception: {e}")
            return {"success": False, "message": str(e)}

    async def get_selected_service(self) -> str:
        try:
            return self.settings.get_selected_service() or ""
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_selected_service exception: {e}")
            return ""

    async def set_selected_service(self, service_name: str) -> dict:
        try:
            self.settings.set_selected_service(service_name)
            return {"success": True}
        except Exception as e:
            decky.logger.error(f"Podman Compose: set_selected_service exception: {e}")
            return {"success": False, "message": str(e)}

    # Stack discovery and control

    async def scan_stacks(self) -> list:
        decky.logger.info("Podman Compose: scan_stacks called")
        try:
            result = self.compose.scan_stacks()
            decky.logger.info(f"Podman Compose: scan_stacks found {len(result)} stacks")
            return result
        except Exception as e:
            decky.logger.error(f"Podman Compose: scan_stacks exception: {e}")
            return []

    async def get_services(self, stack_name: str) -> list:
        try:
            return await self.compose.get_services(stack_name)
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_services exception: {e}")
            return []

    async def get_stack_status_detail(self, stack_name: str) -> dict:
        try:
            return await self.compose.get_status_detail(stack_name)
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_stack_status_detail exception: {e}")
            return {"status": "unknown", "services": []}

    async def compose_action(self, stack_name: str, action: str, services: list = None) -> dict:
        try:
            return await self.compose.run_action(stack_name, action, services)
        except Exception as e:
            decky.logger.error(f"Podman Compose: compose_action exception: {e}")
            return {"success": False, "message": f"Internal error: {e}"}

    # Logs

    async def start_log_stream(self, stack_name: str, services: list = None) -> dict:
        try:
            stack = self.compose.get_stack(stack_name)
            if not stack:
                return {"success": False, "message": f"Stack not found: {stack_name}"}
            return await self.logs.start(stack_name, stack["path"], services or [])
        except Exception as e:
            decky.logger.error(f"Podman Compose: start_log_stream exception: {e}")
            return {"success": False, "message": f"Internal error: {e}"}

    async def get_log_lines(self, stack_name: str, after_index: int) -> dict:
        try:
            return self.logs.get_lines(stack_name, after_index)
        except Exception as e:
            decky.logger.error(f"Podman Compose: get_log_lines exception: {e}")
            return {"lines": [], "next_index": after_index}

    async def stop_log_stream(self, stack_name: str) -> None:
        try:
            await self.logs.stop(stack_name)
        except Exception as e:
            decky.logger.error(f"Podman Compose: stop_log_stream exception: {e}")
