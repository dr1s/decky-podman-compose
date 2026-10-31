import {
  DialogButton,
  DialogControlsSection,
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
} from "@decky/ui";
import { useEffect, useState } from "react";
import { listDirectory } from "../api";

export function DirectoryBrowserModal({
  initialPath,
  onSelect,
  onClose,
}: {
  initialPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [entries, setEntries] = useState<{ name: string; path: string }[]>([]);
  const [error, setError] = useState<string>("");

  const load = async (path: string) => {
    setError("");
    try {
      const result = await listDirectory(path);
      if (result.success && result.entries) {
        setEntries(result.entries);
        setCurrentPath(path);
      } else {
        setError(result.message || "Failed to list directory");
      }
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    load(initialPath);
  }, [initialPath]);

  const parentPath =
    currentPath === "/" ? "/" : currentPath.split("/").slice(0, -1).join("/") || "/";

  return (
    <ModalRoot
      closeModal={onClose}
      bDisableBackgroundDismiss
      bAllowFullSize
      className={`${gamepadDialogClasses.FullWidth} ${gamepadDialogClasses.NoMinWidth}`}
      modalClassName={`${gamepadDialogClasses.FullWidth} ${gamepadDialogClasses.NoMinWidth}`}
    >
      <PanelSection title="Choose directory">
        <div style={{ marginTop: "20px" }}>
          <PanelSectionRow>
            <div
              style={{
                width: "100%",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "4px",
                padding: "8px",
                marginBottom: "8px",
                fontFamily: "monospace",
                wordBreak: "break-all",
                boxSizing: "border-box",
              }}
            >
              {currentPath}
            </div>
          </PanelSectionRow>
          {error && (
            <PanelSectionRow>
              <div style={{ color: "#ff6b6b" }}>{error}</div>
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <DialogControlsSection
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "380px",
                overflow: "auto",
                marginBottom: "16px",
                width: "100%",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "4px",
                padding: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                boxSizing: "border-box",
              }}
            >
              <DialogButton onClick={() => load(parentPath)}>..</DialogButton>
              {entries.map((e) => (
                <DialogButton key={e.path} onClick={() => load(e.path)}>
                  {e.name}/
                </DialogButton>
              ))}
            </DialogControlsSection>
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <DialogButton
                onClick={() => {
                  onSelect(currentPath);
                  onClose();
                }}
              >
                Select
              </DialogButton>
              <DialogButton onClick={onClose}>Cancel</DialogButton>
            </div>
          </PanelSectionRow>
        </div>
      </PanelSection>
    </ModalRoot>
  );
}
