import { describe, expect, it } from "vitest";
import { collapseHome, serviceStatusText, statusColor } from "./utils";

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

describe("collapseHome", () => {
  it("replaces the home directory with ~", () => {
    expect(collapseHome("/home/deck/podman", "/home/deck")).toBe("~/podman");
  });

  it("returns ~ when the path equals the home directory", () => {
    expect(collapseHome("/home/deck", "/home/deck")).toBe("~");
  });

  it("does not replace partial home matches", () => {
    expect(collapseHome("/home/deckerson/podman", "/home/deck")).toBe("/home/deckerson/podman");
  });

  it("returns the original path when home is not provided", () => {
    expect(collapseHome("/home/deck/podman")).toBe("/home/deck/podman");
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
