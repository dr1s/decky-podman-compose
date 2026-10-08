import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
} from "@decky/ui";
import { toaster } from "@decky/api";
import { useEffect, useRef, useState } from "react";
import { getLogLines, startLogStream, stopLogStream } from "../api";
import { LOG_POLL_INTERVAL_MS } from "../constants";

export function LogModal({ stackName, services, onClose }: { stackName: string; services?: string[]; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const logIndexRef = useRef<number>(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      const startResult = await startLogStream(stackName, services);
      if (!startResult.success && mounted) {
        toaster.toast({ title: "Logs error", body: startResult.message || "Failed to start logs" });
      }
      interval = setInterval(async () => {
        try {
          const result = await getLogLines(stackName, logIndexRef.current);
          if (result.lines.length > 0 && mounted) {
            setLogs((prev) => [...prev, ...result.lines]);
            logIndexRef.current = result.next_index;
          }
        } catch (e) {
          console.error("Failed to fetch logs", e);
        }
      }, LOG_POLL_INTERVAL_MS);
    })();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      stopLogStream(stackName);
    };
  }, [stackName]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      style={{ width: "100%", height: "100%", pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <PanelSection title={`Logs: ${stackName}`}>
        <PanelSectionRow>
          <div
            ref={logRef}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#d4d4d4",
              fontFamily: "monospace",
              fontSize: "12px",
              height: "520px",
              overflow: "auto",
              padding: "8px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              pointerEvents: "auto",
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {logs.length === 0 ? "// waiting for logs..." : logs.join("\n")}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onClose}>
            Close
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
}
