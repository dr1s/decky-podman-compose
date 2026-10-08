import type { ServiceStatus } from "./types";

export function statusColor(status: string, health?: string): string {
  const h = health?.toLowerCase();
  if (h === "healthy") return "#4caf50";
  if (h === "unhealthy") return "#f44336";
  if (h === "starting") return "#ff9800";
  const s = status.toLowerCase();
  if (s === "running" || s === "healthy" || s === "completed") return "#4caf50";
  if (s === "partial" || s === "unhealthy" || s.startsWith("created") || s.includes("starting")) return "#ff9800";
  return "#f44336";
}

export function serviceStatusText(s: ServiceStatus): string {
  if (s.health) return `${s.state} (${s.health})`;
  return s.state;
}
