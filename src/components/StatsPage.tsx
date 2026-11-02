import {
  ButtonItem,
  Focusable,
  Navigation,
  PanelSection,
  PanelSectionRow,
} from "@decky/ui";
import { ReactNode, useEffect, useRef, useState } from "react";
import { getStackStats } from "../api";
import { STATS_REFRESH_INTERVAL_MS } from "../constants";
import type { ContainerStats } from "../types";

interface StatsPageShellProps {
  title: string;
  children: ReactNode;
}

function StatsPageShell({ title, children }: StatsPageShellProps) {
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

const HISTORY_SIZE = 20;

function parsePercent(value?: string): number {
  if (!value) return 0;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function Sparkline({ values, color, max }: { values: number[]; color: string; max?: number }) {
  const effectiveMax = max ?? Math.max(1, ...values);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1px",
        height: "20px",
        width: "60px",
      }}
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: "1 1 auto",
            backgroundColor: color,
            height: `${(v / effectiveMax) * 100}%`,
            minHeight: "1px",
          }}
        />
      ))}
    </div>
  );
}

export function StatsPage({ location }: { location?: { search?: string } }) {
  const params = new URLSearchParams(location?.search ?? window.location.search);
  const stackName = params.get("stack") || "";
  const [stats, setStats] = useState<ContainerStats[]>([]);
  const [history, setHistory] = useState<Record<string, { cpu: number; mem: number }[]>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stackName) return;
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    const fetchStats = async () => {
      try {
        const result = await getStackStats(stackName);
        if (!mounted) return;
        setStats(result.services);
        setHistory((prev) => {
          const next: Record<string, { cpu: number; mem: number }[]> = { ...prev };
          for (const s of result.services) {
            const entry = { cpu: parsePercent(s.cpu), mem: parsePercent(s.mem_percent) };
            const existing = next[s.name] || [];
            next[s.name] = [...existing.slice(-HISTORY_SIZE + 1), entry];
          }
          return next;
        });
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };

    fetchStats();
    interval = setInterval(fetchStats, STATS_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [stackName]);

  if (!stackName) {
    return (
      <StatsPageShell title="Stats">
        <PanelSectionRow>
          <div style={{ padding: "8px" }}>No stack selected.</div>
        </PanelSectionRow>
      </StatsPageShell>
    );
  }

  const headerStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "12px",
    color: "#bbb",
    padding: "6px 4px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
  };

  const cellStyle: React.CSSProperties = {
    fontSize: "12px",
    padding: "6px 4px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  };

  return (
    <StatsPageShell title={`Stats: ${stackName}`}>
      <PanelSectionRow>
        <Focusable
          ref={tableRef}
          style={{
            backgroundColor: "#1a1a1a",
            color: "#d4d4d4",
            fontFamily: "monospace",
            height: "calc(100vh - 200px)",
            overflow: "auto",
            padding: "8px",
            pointerEvents: "auto",
          }}
        >
          {stats.length === 0 ? (
            <div style={{ padding: "8px" }}>// no running containers</div>
          ) : (
            <div style={{ display: "table", width: "100%", minWidth: "600px" }}>
              <div style={{ display: "table-row" }}>
                <div style={{ ...headerStyle, display: "table-cell" }}>Name</div>
                <div style={{ ...headerStyle, display: "table-cell" }}>CPU</div>
                <div style={{ ...headerStyle, display: "table-cell" }}></div>
                <div style={{ ...headerStyle, display: "table-cell" }}>Mem%</div>
                <div style={{ ...headerStyle, display: "table-cell" }}></div>
                <div style={{ ...headerStyle, display: "table-cell" }}>Mem</div>
                <div style={{ ...headerStyle, display: "table-cell" }}>Net</div>
                <div style={{ ...headerStyle, display: "table-cell" }}>Block I/O</div>
                <div style={{ ...headerStyle, display: "table-cell" }}>PIDs</div>
              </div>
              {stats.map((s) => {
                const hist = history[s.name] || [];
                const cpuValues = hist.map((h) => h.cpu);
                const memValues = hist.map((h) => h.mem);
                return (
                  <div key={s.name} style={{ display: "table-row" }}>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.name}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.cpu || "—"}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>
                      {cpuValues.length > 0 ? <Sparkline values={cpuValues} color="#1a9fff" max={100} /> : "—"}
                    </div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.mem_percent || "—"}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>
                      {memValues.length > 0 ? <Sparkline values={memValues} color="#4caf50" max={100} /> : "—"}
                    </div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.mem_usage || "—"}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.net_io || "—"}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.block_io || "—"}</div>
                    <div style={{ ...cellStyle, display: "table-cell" }}>{s.pids || "—"}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Focusable>
      </PanelSectionRow>
    </StatsPageShell>
  );
}
