import { DialogButton, PanelSectionRow } from "@decky/ui";
import { Spinner } from "./Spinner";

interface ActionsPanelProps {
  pendingAction: string | null;
  onAction: (action: string) => void;
}

const ACTIONS = ["up", "down", "start", "stop", "pull"];

export function ActionsPanel({ pendingAction, onAction }: ActionsPanelProps) {
  return (
    <PanelSectionRow>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
        <div style={{ marginBottom: "4px", fontSize: "13px", color: "#bbb" }}>Actions:</div>
        {pendingAction !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#bbb" }}>
            <Spinner size={16} />
            <span>Executing: {pendingAction}</span>
          </div>
        )}
        {ACTIONS.map((action) => (
          <DialogButton
            key={action}
            onClick={() => onAction(action)}
            disabled={pendingAction !== null}
          >
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </DialogButton>
        ))}
      </div>
    </PanelSectionRow>
  );
}
