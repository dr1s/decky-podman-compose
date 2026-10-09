import { DialogButton, PanelSection, PanelSectionRow, showModal } from "@decky/ui";
import { ALL_SERVICES } from "../constants";
import { useStacks } from "../hooks/useStacks";

declare const process: { env: Record<string, string | undefined> };
import { ActionsPanel } from "./ActionsPanel";
import { DirectoryBrowserModal } from "./DirectoryBrowserModal";
import { Divider } from "./Divider";
import { LogModal } from "./LogModal";
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

  const handleBrowseBaseDir = () => {
    const home = process.env.HOME || "/home/deck";
    const startPath = baseDir.startsWith("~") ? baseDir.replace("~", home) : baseDir;
    const result = showModal(
      <DirectoryBrowserModal
        initialPath={startPath}
        onSelect={(path) => setBaseDir(path)}
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

  const openLogModal = () => {
    if (selectedStack === undefined) return;
    const svcs = selectedService === ALL_SERVICES ? [] : [selectedService];
    const title = svcs.length > 0 ? `Logs: ${selectedStack}/${svcs[0]}` : `Logs: ${selectedStack}`;
    const result = showModal(
      <LogModal
        stackName={selectedStack}
        services={svcs}
        onClose={() => result.Close()}
      />,
      undefined,
      {
        popupWidth: 900,
        popupHeight: 650,
        strTitle: title,
      }
    );
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
            <DialogButton onClick={openLogModal} disabled={!selectedStack}>
              Open logs
            </DialogButton>
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
