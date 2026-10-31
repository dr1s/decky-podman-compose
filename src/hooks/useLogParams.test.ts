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
  it("parses stack and services from the provided search string", () => {
    const { result } = renderHook(() => useLogParams("?stack=my-stack&services=web,db"));
    expect(result.current.stackName).toBe("my-stack");
    expect(result.current.services).toEqual(["web", "db"]);
  });

  it("falls back to window.location.search when no argument is given", () => {
    setSearch("?stack=window-stack&services=cache");
    const { result } = renderHook(() => useLogParams());
    expect(result.current.stackName).toBe("window-stack");
    expect(result.current.services).toEqual(["cache"]);
  });

  it("returns an empty stack name when the parameter is missing", () => {
    const { result } = renderHook(() => useLogParams(""));
    expect(result.current.stackName).toBe("");
    expect(result.current.services).toEqual([]);
  });

  it("returns an empty services array when the services parameter is missing", () => {
    const { result } = renderHook(() => useLogParams("?stack=another-stack"));
    expect(result.current.stackName).toBe("another-stack");
    expect(result.current.services).toEqual([]);
  });

  it("filters out empty service names", () => {
    const { result } = renderHook(() => useLogParams("?stack=stack&services=web,,db,"));
    expect(result.current.services).toEqual(["web", "db"]);
  });
});
