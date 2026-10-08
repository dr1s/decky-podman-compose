import asyncio
import os
import tempfile
from unittest.mock import MagicMock
from py_modules.compose_manager import ComposeManager


def _setup_manager(base):
    settings = MagicMock()
    settings.get_base_dir.return_value = base
    mgr = ComposeManager(settings)
    return mgr


def test_scan_stacks_finds_supported_files():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        os.makedirs(os.path.join(base, "stack2"))
        open(os.path.join(base, "stack2", "docker-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        stacks = mgr.scan_stacks()
        names = {s["name"] for s in stacks}
        assert names == {"stack1", "stack2"}
        stack1 = next(s for s in stacks if s["name"] == "stack1")
        assert stack1["path"].endswith("stack1")


def test_scan_stacks_returns_empty_for_empty_base():
    with tempfile.TemporaryDirectory() as base:
        mgr = _setup_manager(base)
        stacks = mgr.scan_stacks()
        assert stacks == []


def test_run_action_builds_up_command():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()
        captured = {"cmds": []}

        async def fake_run(cmd, cwd, env=None, timeout=None):
            captured["cmds"].append(cmd)
            captured["cwd"] = cwd
            if cmd[2:5] == ["ps", "-a", "--format"]:
                return (0, "[]", "")
            return (0, "ok", "")

        mgr._run = fake_run
        result = asyncio.run(mgr.run_action("stack1", "up", ["svc1"]))
        assert captured["cmds"][0] == ["podman", "compose", "--verbose", "up", "-d", "svc1"]
        assert captured["cwd"] == os.path.join(base, "stack1")
        assert result["success"] is True


def test_run_action_builds_down_command_no_services():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()
        captured = {}

        async def fake_run(cmd, cwd, env=None, timeout=None):
            captured["cmd"] = cmd
            captured["cwd"] = cwd
            return (0, "ok", "")

        mgr._run = fake_run
        result = asyncio.run(mgr.run_action("stack1", "down"))
        assert captured["cmd"] == ["podman", "compose", "down"]
        assert result["success"] is True


def test_run_action_builds_down_command_with_services():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()
        captured = {}

        async def fake_run(cmd, cwd, env=None, timeout=None):
            captured["cmd"] = cmd
            captured["cwd"] = cwd
            return (0, "ok", "")

        mgr._run = fake_run
        result = asyncio.run(mgr.run_action("stack1", "down", ["svc1"]))
        assert captured["cmd"] == ["podman", "compose", "down", "svc1"]
        assert result["success"] is True


def test_run_action_builds_pull_command():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()
        captured = {}

        async def fake_run(cmd, cwd, env=None, timeout=None):
            captured["cmd"] = cmd
            captured["cwd"] = cwd
            return (0, "ok", "")

        mgr._run = fake_run
        result = asyncio.run(mgr.run_action("stack1", "pull", ["svc1"]))
        assert captured["cmd"] == ["podman", "compose", "pull", "svc1"]
        assert result["success"] is True


def test_run_action_rejects_unknown_stack():
    with tempfile.TemporaryDirectory() as base:
        mgr = _setup_manager(base)
        mgr.scan_stacks()
        result = asyncio.run(mgr.run_action("nope", "up"))
        assert result["success"] is False


def test_get_status_detail_returns_service_states():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "docker-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()

        async def fake_services(stack_name):
            return ["web", "db"]

        async def fake_run(cmd, cwd, env=None, timeout=None):
            import json as _json
            ps = [
                {
                    "Name": "stack1_web_1",
                    "State": "running",
                    "Status": "Up 2 minutes (healthy)",
                    "Labels": {"com.docker.compose.service": "web"},
                },
                {
                    "Name": "stack1_db_1",
                    "State": "exited",
                    "Exited": True,
                    "ExitCode": 0,
                    "Status": "Exited (0)",
                    "Labels": {"com.docker.compose.service": "db"},
                },
            ]
            return (0, _json.dumps(ps), "")

        mgr.get_services = fake_services
        mgr._run = fake_run
        detail = asyncio.run(mgr.get_status_detail("stack1"))
        assert detail["status"] == "running"
        web = next(s for s in detail["services"] if s["name"] == "web")
        db = next(s for s in detail["services"] if s["name"] == "db")
        assert web["state"] == "running"
        assert web["health"] == "healthy"
        assert db["state"] == "completed"


def test_get_services_caches_result_per_stack():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()

        call_count = 0

        async def fake_run(cmd, cwd, env=None, timeout=None):
            nonlocal call_count
            call_count += 1
            return (0, "web\ndb\n", "")

        mgr._run = fake_run
        first = asyncio.run(mgr.get_services("stack1"))
        second = asyncio.run(mgr.get_services("stack1"))
        assert first == ["web", "db"]
        assert second == first
        assert call_count == 1


def test_scan_stacks_clears_service_cache():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()

        call_count = 0

        async def fake_run(cmd, cwd, env=None, timeout=None):
            nonlocal call_count
            call_count += 1
            return (0, "web\n", "")

        mgr._run = fake_run
        asyncio.run(mgr.get_services("stack1"))
        mgr.scan_stacks()
        asyncio.run(mgr.get_services("stack1"))
        assert call_count == 2


def test_run_action_uses_action_specific_timeouts():
    with tempfile.TemporaryDirectory() as base:
        os.makedirs(os.path.join(base, "stack1"))
        open(os.path.join(base, "stack1", "container-compose.yml"), "w").close()
        mgr = _setup_manager(base)
        mgr.scan_stacks()

        timeouts = {}

        async def fake_run(cmd, cwd, env=None, timeout=None):
            action = next((a for a in ("pull", "up", "down", "start", "stop") if a in cmd), cmd[-1])
            timeouts[action] = timeout
            return (0, "ok", "")

        mgr._run = fake_run
        asyncio.run(mgr.run_action("stack1", "pull", ["svc1"]))
        asyncio.run(mgr.run_action("stack1", "up", ["svc1"]))
        asyncio.run(mgr.run_action("stack1", "stop", ["svc1"]))
        assert timeouts["pull"] == 600
        assert timeouts["up"] == 300
        assert timeouts["stop"] == 120
