import { cleanup, fireEvent, render, screen, waitFor, renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PULSE_QUICK_LINKS, PULSE_QUICK_LINKS_STORAGE_KEY } from "@/features/pulse/quick-links/defaults";
import {
  isValidQuickLinkHref,
  loadQuickLinksFromStorage,
  normalizeQuickLinks,
} from "@/features/pulse/quick-links/normalize";
import { PulseQuickLinksSection } from "@/features/pulse/quick-links/pulse-quick-links-section";
import type { PulseQuickLink } from "@/features/pulse/quick-links/types";
import { usePulseQuickLinks } from "@/features/pulse/quick-links/use-pulse-quick-links";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const createStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe("pulse quick links normalize", () => {
  it("returns defaults when storage is empty", () => {
    expect(loadQuickLinksFromStorage(null)).toEqual(DEFAULT_PULSE_QUICK_LINKS);
  });

  it("returns defaults for invalid payload", () => {
    expect(normalizeQuickLinks([{ id: "", label: "", href: "bad" }])).toEqual(DEFAULT_PULSE_QUICK_LINKS);
  });

  it("accepts internal and external href", () => {
    expect(isValidQuickLinkHref("//example.com")).toBe(false);
    expect(isValidQuickLinkHref("/tracker/tasks")).toBe(true);
    expect(isValidQuickLinkHref("https://example.com")).toBe(true);
    expect(isValidQuickLinkHref("javascript:alert(1)")).toBe(false);
  });
});

describe("usePulseQuickLinks", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("reorders links", async () => {
    const { result } = renderHook(() => usePulseQuickLinks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstId = result.current.links[0]?.id;
    const secondId = result.current.links[1]?.id;

    act(() => {
      result.current.reorderLinks(0, 1);
    });

    expect(result.current.links[0]?.id).toBe(secondId);
    expect(result.current.links[1]?.id).toBe(firstId);
  });

  it("does not remove the last link", async () => {
    const singleLink: PulseQuickLink[] = [{ id: "only", label: "Only", href: "/only" }];
    window.localStorage.setItem(PULSE_QUICK_LINKS_STORAGE_KEY, JSON.stringify(singleLink));

    const { result } = renderHook(() => usePulseQuickLinks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.removeLink("only");
    });

    expect(result.current.links).toHaveLength(1);
    expect(result.current.links[0]?.id).toBe("only");
  });

  it("accepts external https href on add", async () => {
    const { result } = renderHook(() => usePulseQuickLinks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialLength = result.current.links.length;

    act(() => {
      result.current.addLink("Example", "https://example.com");
    });

    expect(result.current.links).toHaveLength(initialLength + 1);
    expect(result.current.links.at(-1)?.href).toBe("https://example.com");
  });

  it("rejects unsafe href on add", async () => {
    const { result } = renderHook(() => usePulseQuickLinks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialLength = result.current.links.length;

    act(() => {
      result.current.addLink("Bad", "javascript:alert(1)");
    });

    expect(result.current.links).toHaveLength(initialLength);
  });
});

describe("PulseQuickLinksSection", () => {
  const baseLinks = DEFAULT_PULSE_QUICK_LINKS.slice(0, 2);

  afterEach(() => {
    cleanup();
  });

  it("opens edit modal and adds a link", () => {
    const onAddLink = vi.fn(() => true);

    render(
      <PulseQuickLinksSection
        links={baseLinks}
        onAddLink={onAddLink}
        onUpdateLink={vi.fn(() => true)}
        onRemoveLink={vi.fn(() => true)}
        onReorderLinks={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Редактировать быстрые ссылки" }));
    expect(screen.getByRole("dialog", { name: "Быстрые ссылки" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Редактирование быстрых ссылок" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Добавить ссылку" }));
    fireEvent.change(screen.getByLabelText("Название новой ссылки"), { target: { value: "Wiki" } });
    fireEvent.change(screen.getByLabelText("URL новой ссылки"), { target: { value: "/wiki" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

    expect(onAddLink).toHaveBeenCalledWith("Wiki", "/wiki");
  });
});
