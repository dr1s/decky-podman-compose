import json
import os
from typing import Optional


DEFAULT_BASE_DIR = "~/podman"
SETTINGS_FILE = "settings.json"


class SettingsStore:
    def __init__(self, settings_dir: str):
        self._settings_dir = os.path.expanduser(settings_dir) if settings_dir else settings_dir
        self._settings = {}
        self.load()

    def _settings_path(self) -> str:
        return os.path.join(self._settings_dir, SETTINGS_FILE)

    def load(self) -> dict:
        path = self._settings_path()
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self._settings = json.load(f)
            except (json.JSONDecodeError, OSError):
                self._settings = {}
        else:
            self._settings = {}
        return self._settings

    def save(self) -> None:
        if not self._settings_dir:
            raise RuntimeError("Settings directory is not set")
        os.makedirs(self._settings_dir, exist_ok=True)
        with open(self._settings_path(), "w", encoding="utf-8") as f:
            json.dump(self._settings, f, indent=2)

    def get_base_dir(self) -> str:
        return self._settings.get("base_dir", os.path.expanduser(DEFAULT_BASE_DIR))

    def set_base_dir(self, path: str) -> tuple[bool, str]:
        expanded = os.path.expanduser(path) if path else ""
        if not os.path.isdir(expanded):
            return False, f"Directory does not exist: {path}"
        self._settings["base_dir"] = expanded
        self.save()
        return True, ""

    def get_selected_stack(self) -> Optional[str]:
        return self._settings.get("selected_stack")

    def set_selected_stack(self, stack_name: Optional[str]) -> None:
        if stack_name:
            self._settings["selected_stack"] = stack_name
        else:
            self._settings.pop("selected_stack", None)
        self.save()

    def get_selected_service(self) -> Optional[str]:
        return self._settings.get("selected_service")

    def set_selected_service(self, service_name: Optional[str]) -> None:
        if service_name:
            self._settings["selected_service"] = service_name
        else:
            self._settings.pop("selected_service", None)
        self.save()


