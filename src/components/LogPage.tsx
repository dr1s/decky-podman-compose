import {
  ButtonItem,
  Focusable,
  Navigation,
  PanelSection,
  PanelSectionRow,
} from "@decky/ui";
import { toaster } from "@decky/api";
import { useEffect, useRef, useState } from "react";
import { getLogLines, startLogStream, stopLogStream } from "../api";
import { LOG_POLL_INTERVAL_MS } from "../constants";

function useLogParams() {
  const params = new URLSearchParams(window.location.search);
  const stackName = params.get("stack") || "";
  const servicesParam = params.get("services");
  const services = servicesParam ? servicesParam.split(",").filter(Boolean) : [];
  return { stackName, services };
}

export function LogPage() {
  const { stackName, services } = useLogParams();
  const [logs, setLogs] = useState<string[]>([]);
  const logIndexRef = useRef<number>(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stackName) return;

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
  }, [stackName, services]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          padding: "16px 0",
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div style={{ margin: "0 -20px", width: "calc(100% + 40px)" }}>
          <PanelSection title={stackName ? `Logs: ${stackName}` : "Logs"}>
          <PanelSectionRow>
            <Focusable
              ref={logRef}
              style={{
                backgroundColor: "#1a1a1a",
                color: "#d4d4d4",
                fontFamily: "monospace",
                fontSize: "12px",
                height: "calc(100vh - 200px)",
                overflow: "auto",
                padding: "8px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                pointerEvents: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              {logs.length === 0 ? "// waiting for logs..." : logs.join("\n")}
            </Focusable>
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ marginBottom: "60px" }}>
              <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
                Close
              </ButtonItem>
            </div>
          </PanelSectionRow>
        </PanelSection>
        </div>
      </div>
  );
}
