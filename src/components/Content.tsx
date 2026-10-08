import { ButtonItem, PanelSection, PanelSectionRow, showModal } from "@decky/ui";
import { ALL_SERVICES } from "../constants";
import { useStacks } from "../hooks/useStacks";
import { ActionsPanel } from "./ActionsPanel";
import { DirectoryBrowserModal } from "./DirectoryBrowserModal";
import { LogModal } from "./LogModal";
import { ServiceSelector } from "./ServiceSelector";
import { SettingsPanel } from "./SettingsPanel";
import { StackSelector } from "./StackSelector";
import { StatusPanel } from "./StatusPanel";

function Divider() {
  return (
    <PanelSectionRow>
      <div
        style={{
          height: "1px",
          backgroundColor: "#444",
          margin: "8px 0",
          width: "100%",
        }}
      />
    </PanelSectionRow>
  );
}

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
    const startPath = baseDir.startsWith("~") ? baseDir.replace("~", "/home/deck") : baseDir;
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
            <ButtonItem layout="below" onClick={openLogModal} disabled={!selectedStack}>
              Open logs
            </ButtonItem>
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
