import { PanelSectionRow } from "@decky/ui";
import type { StackStatusDetail } from "../types";
import { serviceStatusText, statusColor } from "../utils";
import { Spinner } from "./Spinner";

interface StatusPanelProps {
  statusDetail: StackStatusDetail | null;
}

export function StatusPanel({ statusDetail }: StatusPanelProps) {
  return (
    <>
      <PanelSectionRow>
        <div style={{ fontSize: "13px", color: "#bbb" }}>Status:</div>
      </PanelSectionRow>
      {statusDetail === null ? (
        <PanelSectionRow>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#bbb" }}>
            <Spinner size={16} />
            <span>Loading...</span>
          </div>
        </PanelSectionRow>
      ) : statusDetail.services.length === 0 ? (
        <PanelSectionRow>
          <div style={{ color: "#bbb" }}>No services</div>
        </PanelSectionRow>
      ) : (
        <PanelSectionRow>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {statusDetail.services.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: statusColor(s.state, s.health),
                  }}
                />
                <div>
                  {s.name}: {serviceStatusText(s)}
                </div>
              </div>
            ))}
          </div>
        </PanelSectionRow>
      )}
    </>
  );
}
