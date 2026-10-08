import {
  staticClasses,
} from "@decky/ui";
import {
  definePlugin,
} from "@decky/api";
import { SiPodman } from "react-icons/si";
import { Content } from "./components/Content";

export default definePlugin(() => {
  return {
    name: "Podman Compose",
    titleView: <div className={staticClasses.Title}>Podman Compose</div>,
    content: <Content />,
    icon: <SiPodman />,
  };
});
