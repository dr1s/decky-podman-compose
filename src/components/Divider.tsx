import { PanelSectionRow } from "@decky/ui";

export function Divider() {
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
