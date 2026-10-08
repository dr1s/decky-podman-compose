import {
  DialogButton,
  PanelSection,
  PanelSectionRow,
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
    <PanelSection title="Choose directory">
      <div style={{ marginTop: "40px" }}>
        <PanelSectionRow>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{currentPath}</div>
        </PanelSectionRow>
      {error && (
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b" }}>{error}</div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxHeight: "500px",
            overflow: "auto",
            width: "100%",
          }}
        >
          <DialogButton onClick={() => load(parentPath)}>..</DialogButton>
          {entries.map((e) => (
            <DialogButton key={e.path} onClick={() => load(e.path)}>
              {e.name}/
            </DialogButton>
          ))}
        </div>
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
  );
}
