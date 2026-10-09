import { DialogButton, PanelSectionRow, TextField } from "@decky/ui";
import { Divider } from "./Divider";

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
        <TextField
          label="Stacks directory"
          value={baseDir}
          onChange={(e: any) => onBaseDirChange(e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <DialogButton onClick={onBrowse}>
            Browse...
          </DialogButton>
          <DialogButton onClick={onSave} disabled={pendingAction !== null}>
            Save & Rescan
          </DialogButton>
        </div>
      </PanelSectionRow>
      <Divider />
    </>
  );
}
