import { beforeEach, describe, expect, it } from "vitest";
import {
  getOrCreateTabId,
  getOrCreateUser,
  getUserInitials,
} from "@/components/store/pim/pricelists/collab/collab-config";

describe("collab-config · getUserInitials", () => {
  it("takes the first letter of up to two name parts, uppercased", () => {
    expect(getUserInitials("Swift Otter")).toBe("SO");
    expect(getUserInitials("Otter")).toBe("O");
    expect(getUserInitials("brave lynx ibex")).toBe("BL");
  });
});

describe("collab-config · stable identity", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("creates a user once and reuses it across calls", () => {
    const first = getOrCreateUser();
    const second = getOrCreateUser();

    expect(first).toEqual(second);
    expect(typeof first.name).toBe("string");
    expect(first.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("recreates the user when the stored value is malformed", () => {
    window.sessionStorage.setItem("oryx-pricelists-user", "not-json");
    const user = getOrCreateUser();
    expect(user.name).toBeTruthy();
    expect(user.color).toBeTruthy();
  });

  it("keeps a stable tab id across calls", () => {
    const first = getOrCreateTabId();
    const second = getOrCreateTabId();

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });
});
