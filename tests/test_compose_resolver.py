import os
from unittest.mock import patch

from py_modules.compose_manager import ComposeManager


def test_compose_base_cmd_uses_bundled_by_default():
    mgr = ComposeManager(None)
    cmd = mgr._compose_base_cmd()
    assert cmd[0] == "/usr/bin/python3"
    assert cmd[1].endswith("podman_compose.py")


def test_compose_base_cmd_uses_override_env_var():
    mgr = ComposeManager(None)
    with patch.dict(os.environ, {"DECKY_PODMAN_COMPOSE_PATH": "/custom/podman-compose"}):
        cmd = mgr._compose_base_cmd()
    assert cmd == ["/custom/podman-compose"]
