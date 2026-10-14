import tempfile
import os
import pytest
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


def test_load_ignores_corrupt_settings_file():
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "settings.json")
        with open(path, "w") as f:
            f.write("not json")
        store = SettingsStore(d)
        assert store.get_base_dir() == os.path.expanduser("~/podman")


def test_save_raises_when_settings_dir_unset():
    store = SettingsStore("")
    with pytest.raises(RuntimeError):
        store.save()


def test_selected_stack_round_trip():
    with tempfile.TemporaryDirectory() as d:
        store = SettingsStore(d)
        assert store.get_selected_stack() is None
        store.set_selected_stack("web")
        assert store.get_selected_stack() == "web"
        store.set_selected_stack(None)
        assert store.get_selected_stack() is None


def test_selected_service_round_trip():
    with tempfile.TemporaryDirectory() as d:
        store = SettingsStore(d)
        assert store.get_selected_service() is None
        store.set_selected_service("db")
        assert store.get_selected_service() == "db"
        store.set_selected_service("")
        assert store.get_selected_service() is None
