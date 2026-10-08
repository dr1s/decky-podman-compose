from py_modules.log_streamer import LogStreamer, _ANSI_RE


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
