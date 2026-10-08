import { ButtonItem, DialogButton, PanelSectionRow, TextField } from "@decky/ui";

interface SettingsPanelProps {
  baseDir: string;
  pendingAction: string | null;
  onBaseDirChange: (dir: string) => void;
  onBrowse: () => void;
  onSave: () => void;
}

export function SettingsPanel({ baseDir, pendingAction, onBaseDirChange, onBrowse, onSave }: SettingsPanelProps) {
  return (
    <>
      <PanelSectionRow>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <TextField
            label="Stacks directory"
            value={baseDir}
            onChange={(e: any) => onBaseDirChange(e.target.value)}
          />
          <DialogButton onClick={onBrowse}>
            Browse...
          </DialogButton>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onSave} disabled={pendingAction !== null}>
          Save & Rescan
        </ButtonItem>
      </PanelSectionRow>
    </>
  );
}
