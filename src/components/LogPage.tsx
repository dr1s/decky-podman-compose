import {
  ButtonItem,
  Focusable,
  Navigation,
  PanelSection,
  PanelSectionRow,
} from "@decky/ui";
import { toaster } from "@decky/api";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  getLastActionOutput,
  getLogLines,
  getServices,
  startLogStream,
  stopLogStream,
} from "../api";
import { ACTION_TAB, ALL_SERVICES, LOG_POLL_INTERVAL_MS } from "../constants";
import { useLogParams } from "../hooks/useLogParams";

function LogPageShell({ title, children }: { title: string; children: ReactNode }) {
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
        <PanelSection title={title}>
          {children}
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

export function LogPage({ location }: { location?: { search?: string } }) {
  const { stackName, services: initialServices } = useLogParams(location?.search);
  const [allServices, setAllServices] = useState<string[]>([]);
  const [activeService, setActiveService] = useState<string>(ALL_SERVICES);
  const [logs, setLogs] = useState<string[]>([]);
  const [actionOutput, setActionOutput] = useState<string>("");
  const [actionOutputLoading, setActionOutputLoading] = useState(false);
  const logIndexRef = useRef<number>(0);
  const logRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!stackName) return;
    let mounted = true;
    getServices(stackName).then((svcs) => {
      if (mounted) setAllServices(svcs);
    });
    return () => {
      mounted = false;
    };
  }, [stackName]);

  useEffect(() => {
    if (!stackName || allServices.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const initial =
      initialServices.length === 1 && allServices.includes(initialServices[0])
        ? initialServices[0]
        : ALL_SERVICES;
    setActiveService(initial);
  }, [stackName, allServices]);

  useEffect(() => {
    if (!stackName) return;

    setLogs([]);
    logIndexRef.current = 0;

    if (activeService === ACTION_TAB) {
      return;
    }

    const servicesToStream = activeService === ALL_SERVICES ? [] : [activeService];
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      const startResult = await startLogStream(stackName, servicesToStream);
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
  }, [stackName, activeService]);

  useEffect(() => {
    if (!stackName || activeService !== ACTION_TAB) return;
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    const fetchOutput = async () => {
      try {
        const text = await getLastActionOutput(stackName);
        if (mounted) {
          setActionOutput(text);
          setActionOutputLoading(false);
        }
      } catch (e) {
        console.error("Failed to fetch action output", e);
      }
    };

    setActionOutputLoading(true);
    fetchOutput();
    interval = setInterval(fetchOutput, LOG_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [stackName, activeService]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, actionOutput, actionOutputLoading]);

  if (!stackName) {
    return (
      <LogPageShell title="Logs">
        <PanelSectionRow>
          <div style={{ padding: "8px" }}>No stack selected.</div>
        </PanelSectionRow>
      </LogPageShell>
    );
  }

  const tabStyle: React.CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "6px",
    color: "#d4d4d4",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    padding: "10px 16px",
  };

  const activeTabStyle: React.CSSProperties = {
    ...tabStyle,
    backgroundColor: "#1a9fff",
    color: "#ffffff",
  };

  const displayText =
    activeService === ACTION_TAB
      ? actionOutputLoading
        ? "// loading action output..."
        : actionOutput || "// no action output yet"
      : logs.length === 0
        ? "// waiting for logs..."
        : logs.join("\n");

  return (
    <LogPageShell title={`Logs: ${stackName}`}>
      <PanelSectionRow>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            width: "100%",
            paddingLeft: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveService(ACTION_TAB)}
            style={activeService === ACTION_TAB ? activeTabStyle : tabStyle}
          >
            Action
          </button>
          <button
            type="button"
            onClick={() => setActiveService(ALL_SERVICES)}
            style={activeService === ALL_SERVICES ? activeTabStyle : tabStyle}
          >
            All
          </button>
          {allServices.map((svc) => (
            <button
              type="button"
              key={svc}
              onClick={() => setActiveService(svc)}
              style={activeService === svc ? activeTabStyle : tabStyle}
            >
              {svc}
            </button>
          ))}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <Focusable
          ref={logRef}
          style={{
            backgroundColor: "#1a1a1a",
            color: "#d4d4d4",
            fontFamily: "monospace",
            fontSize: "12px",
            height: "calc(100vh - 260px)",
            overflow: "auto",
            padding: "8px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            pointerEvents: "auto",
          }}
        >
          {displayText}
        </Focusable>
      </PanelSectionRow>
    </LogPageShell>
  );
}
