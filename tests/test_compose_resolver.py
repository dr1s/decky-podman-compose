import os
import shutil
from unittest.mock import patch

from py_modules.compose_manager import ComposeManager


def testcompose_base_cmd_uses_bundled_by_default():
    mgr = ComposeManager(None)
    cmd = mgr.compose_base_cmd()
    assert cmd[0] == shutil.which("python3") or "/usr/bin/python3"
    assert cmd[1].endswith("podman_compose.py")


def testcompose_base_cmd_uses_override_env_var():
    mgr = ComposeManager(None)
    with patch.dict(os.environ, {"DECKY_PODMAN_COMPOSE_PATH": "/custom/podman-compose"}):
        cmd = mgr.compose_base_cmd()
    assert cmd == ["/custom/podman-compose"]
