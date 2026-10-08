import { Dropdown, PanelSectionRow } from "@decky/ui";
import { ALL_SERVICES } from "../constants";

interface ServiceSelectorProps {
  services: string[];
  selectedService: string;
  onChange: (name: string) => void;
}

export function ServiceSelector({ services, selectedService, onChange }: ServiceSelectorProps) {
  return (
    <>
      <PanelSectionRow>
        <div style={{ marginBottom: "4px", fontSize: "13px", color: "#bbb" }}>Select service:</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <Dropdown
          rgOptions={[
            { data: ALL_SERVICES, label: "All services" },
            ...services.map((s) => ({ data: s, label: s })),
          ]}
          selectedOption={selectedService}
          renderButtonValue={() =>
            selectedService === ALL_SERVICES ? "All services" : selectedService
          }
          onChange={(option: any) => {
            const value = option?.data ?? option;
            onChange(value);
          }}
        />
      </PanelSectionRow>
    </>
  );
}
