import asyncio
import pytest
import tempfile
import os
from main import Plugin


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
