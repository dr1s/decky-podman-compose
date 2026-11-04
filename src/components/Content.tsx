import { DialogButton, Navigation, PanelSection, PanelSectionRow, showModal } from "@decky/ui";
import { getHomeDir } from "../api";
import { ALL_SERVICES, LOGS_ROUTE, STATS_ROUTE } from "../constants";
import { useStacks } from "../hooks/useStacks";
import { pendingLogState, pendingStatsState } from "../routeState";

import { ActionsPanel } from "./ActionsPanel";
import { DirectoryBrowserModal } from "./DirectoryBrowserModal";
import { Divider } from "./Divider";
import { ServiceSelector } from "./ServiceSelector";
import { SettingsPanel } from "./SettingsPanel";
import { StackSelector } from "./StackSelector";
import { StatusPanel } from "./StatusPanel";

export function Content() {
  const {
    baseDir,
    setBaseDir,
    stacks,
    selectedStack,
    setSelectedStack,
    services,
    selectedService,
    setSelectedService,
    statusDetail,
    pendingAction,
    saveBaseDir,
    runAction,
  } = useStacks();

  const handleBrowseBaseDir = async () => {
    const home = await getHomeDir();
    const startPath = baseDir.startsWith("~") ? baseDir.replace(/^~/, home || "/home/deck") : baseDir;
    const result = showModal(
      <DirectoryBrowserModal
        initialPath={startPath}
        onSelect={(path) => saveBaseDir(path)}
        onClose={() => result.Close()}
      />,
      undefined,
      {
        popupWidth: 500,
        popupHeight: 700,
        strTitle: "Choose stacks directory",
      }
    );
  };

  const openLogs = () => {
    if (selectedStack === undefined) return;
    const svcs = selectedService === ALL_SERVICES ? [] : [selectedService];
    pendingLogState.stackName = selectedStack;
    pendingLogState.services = svcs;
    const servicesParam = svcs.length > 0 ? `&services=${encodeURIComponent(svcs.join(","))}` : "";
    Navigation.Navigate(`${LOGS_ROUTE}?stack=${encodeURIComponent(selectedStack)}${servicesParam}`);
    Navigation.CloseSideMenus();
  };

  const openStats = () => {
    if (selectedStack === undefined) return;
    pendingStatsState.stackName = selectedStack;
    Navigation.Navigate(`${STATS_ROUTE}?stack=${encodeURIComponent(selectedStack)}`);
    Navigation.CloseSideMenus();
  };

  return (
    <PanelSection>
      {stacks.length === 0 && (
        <PanelSectionRow>
          <div>No stacks found in {baseDir}</div>
        </PanelSectionRow>
      )}

      {stacks.length > 0 && selectedStack !== undefined && (
        <>
          <StackSelector
            stacks={stacks}
            selectedStack={selectedStack}
            onChange={setSelectedStack}
          />
          <ServiceSelector
            services={services}
            selectedService={selectedService}
            onChange={setSelectedService}
          />
          <Divider />
          <StatusPanel statusDetail={statusDetail} />
          <Divider />
          <ActionsPanel pendingAction={pendingAction} onAction={runAction} />
          <Divider />
          <PanelSectionRow>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <DialogButton onClick={openLogs} disabled={!selectedStack}>
                Open logs
              </DialogButton>
              <DialogButton onClick={openStats} disabled={!selectedStack}>
                Stats
              </DialogButton>
            </div>
          </PanelSectionRow>
        </>
      )}

      <Divider />
      <SettingsPanel
        baseDir={baseDir}
        pendingAction={pendingAction}
        onBaseDirChange={setBaseDir}
        onBrowse={handleBrowseBaseDir}
        onSave={saveBaseDir}
      />
    </PanelSection>
  );
}
