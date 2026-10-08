import sys
import types


decky = types.ModuleType("decky")
decky.DECKY_SETTINGS_DIR = "/tmp/decky-settings"
decky.DECKY_USER_HOME = "/tmp/decky-home"
decky.DECKY_HOME = "/tmp/decky-homebrew"
decky.logger = types.SimpleNamespace(info=print, error=print, warning=print)
decky.migrate_logs = lambda *a, **k: None
decky.migrate_settings = lambda *a, **k: None
decky.migrate_runtime = lambda *a, **k: None

sys.modules["decky"] = decky
