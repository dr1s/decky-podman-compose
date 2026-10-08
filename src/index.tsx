import {
  ButtonItem,
  DialogButton,
  Dropdown,
  PanelSection,
  PanelSectionRow,
  TextField,
  staticClasses,
  showModal,
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster,
} from "@decky/api";
import { useEffect, useRef, useState } from "react";
import { FaDocker } from "react-icons/fa";

interface Stack {
  name: string;
  path: string;
}

function LogModal({ stackName, services, onClose }: { stackName: string; services?: string[]; onClose: () => void }) {
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

function DirectoryBrowserModal({
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

const setBaseDir = callable<[path: string], { success: boolean; message?: string }>("set_base_dir");
const getBaseDir = callable<[], string>("get_base_dir");
const getSelectedStack = callable<[], string>("get_selected_stack");
const setSelectedStackBackend = callable<[stackName: string], { success: boolean; message?: string }>("set_selected_stack");
const getSelectedService = callable<[], string>("get_selected_service");
const setSelectedServiceBackend = callable<[serviceName: string], { success: boolean; message?: string }>("set_selected_service");
const listDirectory = callable<[path: string], { success: boolean; entries?: { name: string; path: string }[]; message?: string }>("list_directory");
const scanStacks = callable<[], Stack[]>("scan_stacks");
const getServices = callable<[stackName: string], string[]>("get_services");
interface ServiceStatus {
  name: string;
  state: string;
  health: string;
  status: string;
}

interface StackStatusDetail {
  status: string;
  services: ServiceStatus[];
}

const getStackStatus = callable<[stackName: string], StackStatusDetail>("get_stack_status_detail");
const composeAction = callable<[stackName: string, action: string, services?: string[]], { success: boolean; message: string }>("compose_action");
const startLogStream = callable<[stackName: string, services?: string[]], { success: boolean; message?: string }>("start_log_stream");
const getLogLines = callable<[stackName: string, afterIndex: number], { lines: string[]; next_index: number }>("get_log_lines");
const stopLogStream = callable<[stackName: string], void>("stop_log_stream");

const ALL_SERVICES = "__all__";
const LOG_POLL_INTERVAL_MS = 500;
const STATUS_REFRESH_INTERVAL_MS = 5000;

function statusColor(status: string, health?: string): string {
  const h = health?.toLowerCase();
  if (h === "healthy") return "#4caf50";
  if (h === "unhealthy") return "#f44336";
  if (h === "starting") return "#ff9800";
  const s = status.toLowerCase();
  if (s === "running" || s === "healthy" || s === "completed") return "#4caf50";
  if (s === "partial" || s === "unhealthy" || s.startsWith("created") || s.includes("starting")) return "#ff9800";
  return "#f44336";
}

function serviceStatusText(s: ServiceStatus): string {
  if (s.health) return `${s.state} (${s.health})`;
  return s.state;
}

function Spinner({ size = 16 }: { size?: number }) {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setRotation((r) => (r + 10) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
    >
      <circle cx="8" cy="8" r="6" stroke="#444" strokeWidth="2" fill="none" />
      <circle cx="8" cy="8" r="6" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="18" />
    </svg>
  );
}

function Content() {
  const [baseDir, setBaseDirLocal] = useState<string>("~/podman");
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [selectedStack, setSelectedStack] = useState<string | undefined>(undefined);
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>(ALL_SERVICES);
  const [statusDetail, setStatusDetail] = useState<StackStatusDetail | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);



  const loadBaseDir = async () => {
    try {
      const dir = await getBaseDir();
      setBaseDirLocal(dir);
    } catch (e) {
      console.error("Failed to load base dir", e);
    }
  };

  const doScan = async () => {
    try {
      const found = await scanStacks();
      setStacks(found);
      if (found.length > 0 && selectedStack === undefined) {
        const saved = await getSelectedStack();
        const initial = saved && found.some((s) => s.name === saved) ? saved : found[0].name;
        setSelectedStack(initial);
      }
    } catch (e) {
      console.error("Failed to scan stacks", e);
      toaster.toast({ title: "Scan failed", body: String(e) });
    }
  };

  const handleBrowseBaseDir = () => {
    const startPath = baseDir.startsWith("~") ? baseDir.replace("~", "/home/deck") : baseDir;
    const result = showModal(
      <DirectoryBrowserModal
        initialPath={startPath}
        onSelect={(path) => setBaseDirLocal(path)}
        onClose={() => result.Close()}
      />,
      undefined,
      {
        popupWidth: 500,
        popupHeight: 700,
        strTitle: "Choose stacks directory",
      }
    );
  };

  const handleSaveBaseDir = async () => {
    setPendingAction("Saving");
    try {
      const result = await setBaseDir(baseDir);
      if (result.success) {
        await doScan();
        toaster.toast({ title: "Settings saved", body: baseDir });
      } else {
        toaster.toast({ title: "Settings error", body: result.message || "Unknown error" });
      }
    } catch (e) {
      console.error("Podman Compose: save exception", e);
      toaster.toast({ title: "Settings exception", body: String(e) });
    } finally {
      setPendingAction(null);
    }
  };

  const loadServices = async (stackName: string) => {
    try {
      const svc = await getServices(stackName);
      setServices(svc);
      const saved = await getSelectedService();
      if (saved && (saved === ALL_SERVICES || svc.includes(saved))) {
        setSelectedService(saved);
      } else {
        setSelectedService(ALL_SERVICES);
      }
    } catch (e) {
      console.error("Failed to load services", e);
      setServices([]);
      setSelectedService(ALL_SERVICES);
    }
  };

  const loadStatus = async (stackName: string) => {
    try {
      const detail = await getStackStatus(stackName);
      setStatusDetail(detail);
    } catch (e) {
      console.error("Failed to load status", e);
      setStatusDetail({ status: "unknown", services: [] });
    }
  };

  const handleAction = async (action: string) => {
    if (selectedStack === undefined) return;
    setPendingAction(action);
    try {
      const svcs = selectedService === ALL_SERVICES ? [] : [selectedService];
      const result = await composeAction(selectedStack, action, svcs);
      const output = result.message || "(no output)";
      if (result.success) {
        toaster.toast({ title: `${action} succeeded`, body: selectedStack });
      } else {
        toaster.toast({ title: `${action} failed`, body: output });
      }
      await loadStatus(selectedStack);
    } catch (e) {
      const msg = String(e);
      console.error(`Action ${action} failed`, e);
      toaster.toast({ title: `${action} failed`, body: msg });
    } finally {
      setPendingAction(null);
    }
  };

  const openLogModal = () => {
    if (selectedStack === undefined) return;
    const services = selectedService === ALL_SERVICES ? [] : [selectedService];
    const title = services.length > 0 ? `Logs: ${selectedStack}/${services[0]}` : `Logs: ${selectedStack}`;
    const result = showModal(
      <LogModal
        stackName={selectedStack}
        services={services}
        onClose={() => result.Close()}
      />,
      undefined,
      {
        popupWidth: 900,
        popupHeight: 650,
        strTitle: title,
      }
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadBaseDir();
      if (mounted) await doScan();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (selectedStack === undefined) {
        setServices([]);
        setStatusDetail(null);
        return;
      }
      setStatusDetail(null);
      try {
        if (mounted) await loadServices(selectedStack);
        if (mounted) await loadStatus(selectedStack);
      } catch (e) {
        console.error("Failed to load stack data", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedStack]);

  useEffect(() => {
    if (selectedStack === undefined) return;
    const interval = setInterval(() => {
      loadStatus(selectedStack);
    }, STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedStack]);

  return (
    <PanelSection>
      {stacks.length === 0 && (
        <PanelSectionRow>
          <div>No stacks found in {baseDir}</div>
        </PanelSectionRow>
      )}

      {stacks.length > 0 && selectedStack !== undefined && (
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
                setSelectedStack(name);
                setSelectedStackBackend(name);
              }}
            />
          </PanelSectionRow>
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
                setSelectedService(value);
                setSelectedServiceBackend(value);
              }}
            />
          </PanelSectionRow>
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
          <PanelSectionRow>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", color: "#bbb" }}>Actions:</div>
              {pendingAction !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#bbb" }}>
                  <Spinner size={16} />
                  <span>Executing: {pendingAction}</span>
                </div>
              )}
              <DialogButton onClick={() => handleAction("up")} disabled={pendingAction !== null}>
                Up
              </DialogButton>
              <DialogButton onClick={() => handleAction("down")} disabled={pendingAction !== null}>
                Down
              </DialogButton>
              <DialogButton onClick={() => handleAction("start")} disabled={pendingAction !== null}>
                Start
              </DialogButton>
              <DialogButton onClick={() => handleAction("stop")} disabled={pendingAction !== null}>
                Stop
              </DialogButton>
              <DialogButton onClick={() => handleAction("pull")} disabled={pendingAction !== null}>
                Pull
              </DialogButton>
            </div>
          </PanelSectionRow>
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
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={openLogModal} disabled={!selectedStack}>
              Open logs
            </ButtonItem>
          </PanelSectionRow>
        </>
      )}

      <PanelSectionRow>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <TextField
            label="Stacks directory"
            value={baseDir}
            onChange={(e: any) => setBaseDirLocal(e.target.value)}
          />
          <DialogButton onClick={handleBrowseBaseDir}>
            Browse...
          </DialogButton>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={handleSaveBaseDir} disabled={pendingAction !== null}>
          Save & Rescan
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "Podman Compose",
    titleView: <div className={staticClasses.Title}>Podman Compose</div>,
    content: <Content />,
    icon: <FaDocker />,
  };
});
