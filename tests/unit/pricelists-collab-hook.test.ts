import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Replace the WebSocket transport with an inert fake so the hook can exercise
// the real Y.Doc maps without opening a network connection.
vi.mock("y-websocket", () => {
  class FakeAwareness {
    clientID = 1;
    private states = new Map<number, unknown>();
    setLocalState(state: unknown) {
      if (state === null) {
        this.states.delete(this.clientID);
      } else {
        this.states.set(this.clientID, state);
      }
    }
    getLocalState() {
      return this.states.get(this.clientID) ?? null;
    }
    getStates() {
      return this.states;
    }
    on() { }
    off() { }
  }

  class WebsocketProvider {
    awareness = new FakeAwareness();
    wsconnected = false;
    synced = false;
    bcconnected = false;
    constructor(
      _url: string,
      _room: string,
      public doc: unknown,
    ) { }
    on() { }
    off() { }
    destroy() { }
  }

  return { WebsocketProvider };
});

import { useYjsPricelists } from "@/components/store/pim/pricelists/collab/use-yjs-pricelists";

describe("useYjsPricelists", () => {
  it("reads and writes price cells through the shared doc", () => {
    const { result } = renderHook(() => useYjsPricelists());

    expect(result.current.getCell("ru:v1:dealer")).toBeUndefined();
    act(() => result.current.setCell("ru:v1:dealer", { amount: 100, currency: "USD" }));
    expect(result.current.getCell("ru:v1:dealer")).toEqual({ amount: 100, currency: "USD" });
  });

  it("reads and writes dealer statuses", () => {
    const { result } = renderHook(() => useYjsPricelists());

    act(() => result.current.setStatus("ru:v1:dealerStatus", "available"));
    expect(result.current.getStatus("ru:v1:dealerStatus")).toBe("available");
  });

  it("stores parameter definitions and values, including override cleanup", () => {
    const { result } = renderHook(() => useYjsPricelists());

    act(() => result.current.setParamDefs("ru", [{ id: "customs", label: "Customs (USD)" }]));
    expect(result.current.getParamDefs("ru")).toEqual([{ id: "customs", label: "Customs (USD)" }]);

    act(() => {
      result.current.setParamValue("ru:param:customs:base", 300);
      result.current.setParamValue("ru:param:customs:v1", 10);
      result.current.setParamValue("ru:param:customs:v2", 20);
    });
    expect(result.current.getParamValue("ru:param:customs:v1")).toBe(10);

    act(() => result.current.clearParamValue("ru:param:customs:v2"));
    expect(result.current.getParamValue("ru:param:customs:v2")).toBeUndefined();

    act(() => result.current.clearParamOverrides("ru", "customs"));
    expect(result.current.getParamValue("ru:param:customs:base")).toBe(300);
    expect(result.current.getParamValue("ru:param:customs:v1")).toBeUndefined();
  });

  it("exposes presence helpers without throwing", () => {
    const { result } = renderHook(() => useYjsPricelists());

    expect(result.current.getEditors("ru:v1:dealer")).toEqual([]);
    expect(Array.isArray(result.current.onlineUsers)).toBe(true);
    expect(() => act(() => result.current.setEditing("ru:v1:dealer"))).not.toThrow();
    expect(() => act(() => result.current.setEditing(null))).not.toThrow();
  });
});
