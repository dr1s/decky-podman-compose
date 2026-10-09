import os


def clean_subprocess_env(env: dict[str, str] | None = None) -> dict[str, str]:
    """Return a copy of the environment safe for spawning podman subprocesses.

    Removes Decky/PyInstaller-bundled library paths that conflict with system
    libraries required by podman/systemd-run.
    """
    if env is None:
        env = os.environ
    return {k: v for k, v in env.items() if k.upper() not in ("LD_LIBRARY_PATH", "LD_PRELOAD")}
