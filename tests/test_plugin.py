import asyncio
import os
import pytest
import tempfile
from main import Plugin, _merge_shell_env


@pytest.mark.asyncio
async def test_plugin_initializes():
    with tempfile.TemporaryDirectory() as d:
        os.environ["DECKY_SETTINGS_DIR"] = d
        p = Plugin()
        await p._main()
        assert p.settings is not None
        assert p.compose is not None
        assert p.logs is not None
        await p._unload()


@pytest.mark.asyncio
async def test_set_and_get_base_dir():
    with tempfile.TemporaryDirectory() as d:
        os.environ["DECKY_SETTINGS_DIR"] = d
        p = Plugin()
        await p._main()
        result = await p.set_base_dir(d)
        assert result["success"] is True
        assert await p.get_base_dir() == d
        await p._unload()


@pytest.mark.asyncio
async def test_scan_stacks_via_plugin():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "svc"))
        open(os.path.join(base, "svc", "container-compose.yml"), "w").close()
        os.environ["DECKY_SETTINGS_DIR"] = base
        p = Plugin()
        await p._main()
        await p.set_base_dir(base)
        stacks = await p.scan_stacks()
        assert any(s["name"] == "svc" for s in stacks)
        await p._unload()


def test_merge_shell_env_appends_missing_path_entries(monkeypatch):
    monkeypatch.setenv("PATH", "/decky/bin")
    _merge_shell_env({"PATH": "/usr/local/bin:/usr/bin"})
    paths = os.environ["PATH"].split(os.pathsep)
    assert "/decky/bin" in paths
    assert "/usr/local/bin" in paths
    assert "/usr/bin" in paths


def test_merge_shell_env_adds_missing_vars(monkeypatch):
    monkeypatch.delenv("TEST_PODMAN_VAR", raising=False)
    _merge_shell_env({"TEST_PODMAN_VAR": "value"})
    assert os.environ["TEST_PODMAN_VAR"] == "value"


def test_merge_shell_env_preserves_decky_vars(monkeypatch):
    monkeypatch.setenv("DECKY_PLUGIN_DIR", "/original")
    _merge_shell_env({"DECKY_PLUGIN_DIR": "/shell"})
    assert os.environ["DECKY_PLUGIN_DIR"] == "/original"
