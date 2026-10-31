import { describe, expect, it } from "vitest";
import { serviceStatusText, statusColor } from "./utils";

describe("statusColor", () => {
  it("returns green for healthy health", () => {
    expect(statusColor("running", "healthy")).toBe("#4caf50");
  });

  it("returns red for unhealthy health regardless of state", () => {
    expect(statusColor("running", "unhealthy")).toBe("#f44336");
  });

  it("returns orange for starting health", () => {
    expect(statusColor("running", "starting")).toBe("#ff9800");
  });

  it("returns green for running/healthy/completed states", () => {
    expect(statusColor("running")).toBe("#4caf50");
    expect(statusColor("healthy")).toBe("#4caf50");
    expect(statusColor("completed")).toBe("#4caf50");
  });

  it("returns orange for created/starting/partial states", () => {
    expect(statusColor("created")).toBe("#ff9800");
    expect(statusColor("starting")).toBe("#ff9800");
    expect(statusColor("partial")).toBe("#ff9800");
  });

  it("returns red for stopped/failed/unknown states", () => {
    expect(statusColor("stopped")).toBe("#f44336");
    expect(statusColor("failed")).toBe("#f44336");
    expect(statusColor("unknown")).toBe("#f44336");
  });
});

describe("serviceStatusText", () => {
  it("includes health when present", () => {
    expect(serviceStatusText({ name: "web", state: "running", health: "healthy" })).toBe(
      "running (healthy)",
    );
  });

  it("returns state only when health is absent", () => {
    expect(serviceStatusText({ name: "web", state: "running" })).toBe("running");
  });
});
