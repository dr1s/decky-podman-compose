import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from py_modules.log_streamer import LogStreamer, _ANSI_RE, MAX_LOG_LINES


def test_ring_buffer_index_stability():
    streamer = LogStreamer()
    streamer._buffers["s1"] = {"base": 0, "lines": ["a", "b", "c"], "proc": None}
    result = streamer.get_lines("s1", 0)
    assert result["lines"] == ["a", "b", "c"]
    assert result["next_index"] == 3

    # simulate overflow: drop first line, base shifts
    streamer._buffers["s1"] = {"base": 1, "lines": ["b", "c", "d"], "proc": None}
    result = streamer.get_lines("s1", 0)
    assert result["lines"] == ["b", "c", "d"]
    assert result["next_index"] == 4

    result = streamer.get_lines("s1", 3)
    assert result["lines"] == ["d"]
    assert result["next_index"] == 4


def test_get_lines_for_unknown_stack():
    streamer = LogStreamer()
    result = streamer.get_lines("unknown", 0)
    assert result["lines"] == []
    assert result["next_index"] == 0


def test_append_line_maintains_index():
    streamer = LogStreamer()
    streamer._ensure_buffer("s1")
    streamer._append_line("s1", "line0")
    streamer._append_line("s1", "line1")
    result = streamer.get_lines("s1", 0)
    assert result["lines"] == ["line0", "line1"]
    assert result["next_index"] == 2


def test_ansi_regex_strips_csi_color_codes():
    assert _ANSI_RE.sub("", "\x1b[31mred\x1b[0m") == "red"
    assert _ANSI_RE.sub("", "\x1b[1;31mbold red\x1b[0m") == "bold red"
    assert _ANSI_RE.sub("", "\x1b[2K\x1b[1Gclear line") == "clear line"


def test_ansi_regex_strips_osc_window_title():
    assert _ANSI_RE.sub("", "\x1b]0;window title\x07message") == "message"
    assert _ANSI_RE.sub("", "\x1b]0;title\x1b\\message") == "message"


def test_ansi_regex_strips_single_byte_fe_escapes():
    assert _ANSI_RE.sub("", "\x1bMreverse feed") == "reverse feed"
    assert _ANSI_RE.sub("", "\x1b^privacy") == "privacy"


def test_append_line_evicts_old_lines():
    streamer = LogStreamer()
    streamer._ensure_buffer("s1")
    for i in range(MAX_LOG_LINES + 5):
        streamer._append_line("s1", f"line{i}")
    result = streamer.get_lines("s1", 0)
    assert len(result["lines"]) == MAX_LOG_LINES
    assert result["lines"][0] == "line5"
    assert result["lines"][-1] == f"line{MAX_LOG_LINES + 4}"
    assert result["next_index"] == MAX_LOG_LINES + 5


def test_append_line_ignores_unknown_stack():
    streamer = LogStreamer()
    # should not raise
    streamer._append_line("unknown", "line")


def test_get_lines_after_future_index():
    streamer = LogStreamer()
    streamer._ensure_buffer("s1")
    streamer._append_line("s1", "line0")
    result = streamer.get_lines("s1", 100)
    assert result["lines"] == []
    assert result["next_index"] == 1


@pytest.mark.asyncio
async def test_read_loop_reads_and_strips_lines():
    streamer = LogStreamer()
    streamer._ensure_buffer("s1")

    class FakeStdout:
        def __init__(self, chunks):
            self._chunks = chunks
            self._idx = 0

        async def read(self, n):
            if self._idx >= len(self._chunks):
                return b""
            chunk = self._chunks[self._idx]
            self._idx += 1
            return chunk

    class FakeProc:
        def __init__(self):
            self.stdout = FakeStdout([b"line1\n\x1b[31mline2\x1b[0m\n", b"partial"])
            self.returncode = 0

        def terminate(self):
            pass

        async def wait(self):
            return 0

    proc = FakeProc()
    task = asyncio.create_task(streamer._read_loop("s1", proc))
    # Give the loop a chance to process available data and hit EOF.
    await asyncio.sleep(0.1)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    result = streamer.get_lines("s1", 0)
    assert result["lines"] == ["line1", "line2", "partial"]


@pytest.mark.asyncio
async def test_start_returns_failure_when_no_containers():
    streamer = LogStreamer()

    class FakeProc:
        def __init__(self, returncode=0, stdout=b"", stderr=b""):
            self.returncode = returncode
            self._stdout = stdout
            self._stderr = stderr

        async def communicate(self):
            return self._stdout, self._stderr

    with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = FakeProc(returncode=0, stdout=b"[]")
        result = await streamer.start("s1", "/tmp/stack", [], ["/usr/bin/python3", "/tmp/podman_compose.py"])

    assert result["success"] is False
    assert "No containers found" in result["message"]
    # Verify the ps discovery used the provided compose base command.
    ps_call = mock_exec.call_args_list[0]
    shell_cmd = ps_call.args[2]
    assert "/usr/bin/python3 /tmp/podman_compose.py ps --format json" in shell_cmd


@pytest.mark.asyncio
async def test_stop_clears_buffer_and_terminates_proc():
    streamer = LogStreamer()
    streamer._ensure_buffer("s1")
    streamer._buffers["s1"]["lines"] = ["old"]
    streamer._buffers["s1"]["base"] = 5

    proc = MagicMock()
    proc.terminate = MagicMock()
    proc.wait = AsyncMock(return_value=0)
    streamer._buffers["s1"]["proc"] = proc

    async def dummy():
        await asyncio.sleep(0)

    task = asyncio.create_task(dummy())
    task.cancel()
    streamer._tasks["s1"] = task

    await streamer.stop("s1")

    assert streamer._buffers["s1"]["lines"] == []
    assert streamer._buffers["s1"]["base"] == 0
    assert streamer._buffers["s1"]["proc"] is None
    proc.terminate.assert_called_once()


@pytest.mark.asyncio
async def test_stop_all_stops_every_task():
    streamer = LogStreamer()

    async def dummy():
        await asyncio.sleep(0)

    for name in ["s1", "s2"]:
        streamer._ensure_buffer(name)
        task = asyncio.create_task(dummy())
        task.cancel()
        streamer._tasks[name] = task

    await streamer.stop_all()

    assert streamer._tasks == {}

