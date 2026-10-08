import { Dropdown, PanelSectionRow } from "@decky/ui";
import type { Stack } from "../types";

interface StackSelectorProps {
  stacks: Stack[];
  selectedStack: string;
  onChange: (name: string) => void;
}

export function StackSelector({ stacks, selectedStack, onChange }: StackSelectorProps) {
  return (
    <>
      <PanelSectionRow>
        <div style={{ marginBottom: "4px", fontSize: "13px", color: "#bbb" }}>Select stack:</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <Dropdown
          rgOptions={stacks.map((s) => ({ data: s.name, label: s.name }))}
          selectedOption={selectedStack}
          onChange={(option: any) => {
            const name = option?.data ?? option;
            onChange(name);
          }}
        />
      </PanelSectionRow>
    </>
  );
}
