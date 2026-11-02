import type { ComponentType } from "react";
import {
  staticClasses,
} from "@decky/ui";
import {
  definePlugin,
  routerHook,
} from "@decky/api";
import { SiPodman } from "react-icons/si";
import { LOGS_ROUTE } from "./constants";
import type { RouteComponentProps } from "./types";
import { Content } from "./components/Content";
import { LogPage } from "./components/LogPage";

const LogPageRoute: ComponentType = (props) => (
  <LogPage {...(props as RouteComponentProps)} />
);

export default definePlugin(() => {
  routerHook.addRoute(LOGS_ROUTE, LogPageRoute, { exact: true });

  return {
    name: "Podman Compose",
    titleView: <div className={staticClasses.Title}>Podman Compose</div>,
    content: <Content />,
    icon: <SiPodman />,
    onDismount: () => {
      routerHook.removeRoute(LOGS_ROUTE);
    },
  };
});
