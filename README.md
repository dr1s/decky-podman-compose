# Decky Podman Compose

This plugin lets you manage Podman Compose stacks on SteamOS. You use it with Decky Loader.

![screenshot](screenshot.jpg "Screenshot")

## Support

This plugin is for personal use.

- Do not send GitHub issues. Issues are not accepted.
- You can send pull requests. Pull requests are accepted if they are useful and do not add maintenance work.

## Features

- Find compose stacks in a base directory that you choose.
- Use the directory browser to choose the base directory.
- Select a stack. You can also select one service.
- Start, stop, pull, or remove a whole stack or one service.
- View live logs. You can view all services, one service, or the action output.
- View live stats for each running container.
- See status indicators with color-coded health.
- A one-shot container that exits cleanly does not show the stack as partial.

## Stacks directory layout

Set the **Stacks directory** in the plugin settings. The default is `~/podman`.

Each stack must be in its own subdirectory under the base directory. The subdirectory name becomes the stack name.

Example layout:

```
~/podman/
├── web/
│   └── container-compose.yml
├── minecraft/
│   └── container-compose.yml
│   └── container-compose.override.yml
└── database/
    └── docker-compose.yml
```

## Supported compose files

The plugin looks for one of these files in each stack subdirectory:

1. `docker-compose.yml`
2. `podman-compose.yml`
3. `container-compose.yml`

`podman compose` merges override files automatically because commands run from the stack directory.

## Install

1. Make sure Decky Loader is installed on SteamOS.
2. Download the latest `decky-podman-compose-<VERSION>.zip` from the [Releases](../../releases) page.
3. In Game Mode, open the Quick Access Menu. Press the **`...`** button.
4. Open **Decky Loader → Settings → General**. Enable **Developer Mode**.
5. Open the **Developer** tab. Select **Install Plugin from ZIP File**.
6. Select the downloaded ZIP file.
7. The plugin appears in the Decky plugin list.

> [!NOTE]
> This plugin includes `podman-compose`. You do not need to install `podman-compose` separately.
> SteamOS includes `podman` by default. The plugin uses `podman` from `PATH`.
>
> To use a custom `podman-compose` binary, set `DECKY_PODMAN_COMPOSE_PATH` in your login shell profile. For example, in `~/.bash_profile` or `~/.profile`:
>
> ```bash
> export DECKY_PODMAN_COMPOSE_PATH=/path/to/your/podman-compose
> ```
>
> The plugin reads the login shell environment at startup. It does not read `.bashrc`.

## Logs and action output

Open the logs page for a stack to view:

- **All** — combined logs from all services in the stack.
- One tab for each service — logs for only that service.
- **Action** — the live output of the most recent `up`, `down`, `start`, `stop`, or `pull` command for that stack.

The Action tab updates while the command runs. You can follow a long `pull` or `up` without leaving the plugin.

## Stats

The **Stats** button opens a full-screen stats page for the selected stack. It polls `podman stats` each second. It shows a table of running containers with this data:

- Name
- CPU usage and a small graph
- Memory percentage and a small graph
- Memory usage
- Network I/O
- Block I/O
- Process count

Only running containers are shown. Stopped or one-shot containers are not shown. The stats page is read-only. Use the action buttons to start, stop, or pull containers.

## Status colors

Each service shows a colored dot. The color is based on the current state and health check:

- **Green** — `running`, `healthy`, or `completed`
- **Yellow / Orange** — `created`, `starting`, or `partial`
- **Red** — `stopped`, `failed`, `unhealthy`, or `unknown`

Health check results have priority over state. For example, a container with state `running` and health `unhealthy` shows red. A container with health `starting` shows orange.

## License

MIT. See LICENSE.
