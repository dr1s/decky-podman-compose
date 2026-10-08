import tempfile
import os
from py_modules.settings import SettingsStore


def test_load_default_settings():
    with tempfile.TemporaryDirectory() as d:
        store = SettingsStore(d)
        assert store.get_base_dir() == os.path.expanduser("~/podman")


def test_set_and_persist_base_dir():
    with tempfile.TemporaryDirectory() as d:
        store = SettingsStore(d)
        ok, msg = store.set_base_dir(d)
        assert ok is True
        assert store.get_base_dir() == d
        store2 = SettingsStore(d)
        assert store2.get_base_dir() == d


def test_set_invalid_base_dir():
    with tempfile.TemporaryDirectory() as d:
        store = SettingsStore(d)
        ok, msg = store.set_base_dir("/nonexistent/path/12345")
        assert ok is False


def test_set_base_dir_expands_tilde():
    home = os.path.expanduser("~")
    with tempfile.TemporaryDirectory(dir=home) as d:
        relative = os.path.relpath(d, home)
        tilde_path = os.path.join("~", relative)
        store = SettingsStore(d)
        ok, msg = store.set_base_dir(tilde_path)
        assert ok is True
        assert store.get_base_dir() == d
