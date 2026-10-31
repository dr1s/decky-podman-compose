import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLogParams } from "./useLogParams";

function setSearch(search: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search },
  });
}

describe("useLogParams", () => {
  it("parses stack and services from the query string", () => {
    setSearch("?stack=my-stack&services=web,db");
    const { result } = renderHook(() => useLogParams());
    expect(result.current.stackName).toBe("my-stack");
    expect(result.current.services).toEqual(["web", "db"]);
  });

  it("returns an empty stack name when the parameter is missing", () => {
    setSearch("");
    const { result } = renderHook(() => useLogParams());
    expect(result.current.stackName).toBe("");
    expect(result.current.services).toEqual([]);
  });

  it("returns an empty services array when the services parameter is missing", () => {
    setSearch("?stack=another-stack");
    const { result } = renderHook(() => useLogParams());
    expect(result.current.stackName).toBe("another-stack");
    expect(result.current.services).toEqual([]);
  });

  it("filters out empty service names", () => {
    setSearch("?stack=stack&services=web,,db,");
    const { result } = renderHook(() => useLogParams());
    expect(result.current.services).toEqual(["web", "db"]);
  });
});
