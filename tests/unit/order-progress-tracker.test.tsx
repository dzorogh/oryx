import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RelatedDocumentItem } from "@/features/logistics/logistics-related";
import {
  OrderProgressTracker,
  parseTrackerMeta,
  resolveStageMarkers,
  stageProgress,
  type OrderProgressStage,
} from "@/features/logistics/ui/order-progress-tracker";

afterEach(() => {
  cleanup();
});

const doc = (
  id: string,
  label: string,
  meta: string,
  extra: Partial<RelatedDocumentItem> = {},
): RelatedDocumentItem => ({
  id,
  label,
  meta,
  href: `/store/logistics/docs/${id}`,
  ...extra,
});

const primaryBase = (
  overrides: Partial<Record<"production" | "output" | "transfer" | "shipment", RelatedDocumentItem[]>> = {},
): OrderProgressStage[] => [
  {
    id: "production",
    title: "Production",
    href: "/store/logistics/production-orders",
    items: overrides.production ?? [],
    doneStatuses: ["done", "closed"],
    actions: [{ label: "New production order", onClick: vi.fn() }],
  },
  {
    id: "output",
    title: "Output",
    href: "/store/logistics/outputs",
    items: overrides.output ?? [],
    doneStatuses: ["done"],
    actions: [{ label: "Create output", onClick: vi.fn() }],
  },
  {
    id: "transfer",
    title: "Transfer",
    href: "/store/logistics/transfers",
    items: overrides.transfer ?? [],
    doneStatuses: ["delivered"],
  },
  {
    id: "shipment",
    title: "Shipment",
    href: "/store/logistics/shipments",
    items: overrides.shipment ?? [],
    doneStatuses: ["posted"],
    actions: [{ label: "Ship", onClick: vi.fn() }],
  },
];

describe("order progress helpers", () => {
  it("parses status and date from meta", () => {
    expect(parseTrackerMeta("in_progress · 15 Sep 2026")).toEqual({
      statusKey: "in_progress",
      statusLabel: "В работе",
      extra: "15 Sep 2026",
    });
  });

  it("parses reservation operation · status", () => {
    expect(parseTrackerMeta("reserve · posted")).toEqual({
      statusKey: "posted",
      statusLabel: "Проведён",
      extra: "Резерв",
    });
  });

  it("marks later empty stages pending and keeps several current stages", () => {
    expect(
      resolveStageMarkers([
        { items: [doc("1", "PO-1", "done")], doneStatuses: ["done"] },
        { items: [], doneStatuses: ["done"] },
        { items: [], doneStatuses: ["delivered"] },
      ]),
    ).toEqual(["done", "pending", "pending"]);

    expect(
      resolveStageMarkers([
        { items: [doc("po", "PO-1", "in_progress")], doneStatuses: ["done"] },
        { items: [doc("out", "OUT-1", "done")], doneStatuses: ["done"] },
        { items: [doc("tr", "TR-1", "sent")], doneStatuses: ["delivered"] },
        { items: [], doneStatuses: ["posted"] },
      ]),
    ).toEqual(["current", "done", "current", "pending"]);
  });

  it("treats empty previous stages as passed when a later stage has documents", () => {
    expect(
      resolveStageMarkers([
        { items: [], doneStatuses: ["done"] },
        { items: [], doneStatuses: ["done"] },
        { items: [doc("tr", "TR-1", "sent")], doneStatuses: ["delivered"] },
        { items: [], doneStatuses: ["posted"] },
      ]),
    ).toEqual(["done", "done", "current", "pending"]);
  });

  it("treats empty stage as empty progress", () => {
    expect(stageProgress([], ["done"])).toBe("empty");
  });
});

describe("OrderProgressTracker", () => {
  it("shows status, expected end, and linked stage documents for an open order", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-905"
        status="open"
        expectedEndOn="2026-09-20"
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase({
          production: [
            doc("po-1", "PO-100", "in_progress · 18 Sep 2026", { coveragePercent: 80 }),
          ],
          shipment: [doc("sh-1", "SHP-4", "posted", { coveragePercent: 40 })],
        })}
        secondaryStages={[
          {
            id: "reservations",
            title: "Reservations",
            items: [doc("rsv-1", "RSV-2", "reserve · posted", { coveragePercent: 100 })],
            doneStatuses: ["posted"],
            actions: [{ label: "Reserve", onClick: vi.fn() }],
          },
          {
            id: "returns",
            title: "Returns",
            items: [],
            doneStatuses: ["posted"],
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "OMS-905" })).toBeInTheDocument();
    expect(screen.getByText("Открыт")).toBeInTheDocument();
    expect(screen.getByLabelText("Ожидаемое окончание")).toHaveValue("2026-09-20");
    expect(screen.queryByTestId("expected-end-unset")).not.toBeInTheDocument();

    const progress = screen.getByRole("list", { name: "Ход заказа клиента" });
    expect(within(progress).getByText("PO-100")).toBeInTheDocument();
    expect(within(progress).getByText("В работе")).toBeInTheDocument();
    expect(within(progress).getByText("18 Sep 2026")).toBeInTheDocument();
    expect(within(progress).getByText("80% заказа")).toBeInTheDocument();
    expect(within(progress).getByText("SHP-4")).toBeInTheDocument();
    expect(within(progress).getByText("40% заказа")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PO-100/i })).toHaveAttribute(
      "href",
      "/store/logistics/docs/po-1",
    );
    expect(screen.getByRole("link", { name: /SHP-4/i })).toHaveAttribute(
      "href",
      "/store/logistics/docs/sh-1",
    );
  });

  it("keeps related documents collapsed until the header is opened", async () => {
    const user = userEvent.setup();
    render(
      <OrderProgressTracker
        orderNumber="OMS-905"
        status="open"
        expectedEndOn="2026-09-20"
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase()}
        secondaryStages={[
          {
            id: "reservations",
            title: "Reservations",
            items: [doc("rsv-1", "RSV-2", "reserve · posted", { coveragePercent: 100 })],
            doneStatuses: ["posted"],
            actions: [{ label: "Reserve", onClick: vi.fn() }],
          },
          {
            id: "returns",
            title: "Returns",
            items: [],
            doneStatuses: ["posted"],
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Связанные" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Связанные документы" })).not.toBeInTheDocument();
    expect(screen.queryByText("RSV-2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Связанные" }));

    const related = await screen.findByRole("list", { name: "Связанные документы" });
    expect(within(related).getByText("RSV-2")).toBeInTheDocument();
    expect(within(related).getByText("Reservations")).toBeInTheDocument();
    expect(within(related).getByText("Returns")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Связанные" }));
    expect(screen.queryByRole("list", { name: "Связанные документы" })).not.toBeInTheDocument();
    expect(screen.queryByText("RSV-2")).not.toBeInTheDocument();
  });

  it("keeps several documents in one stage and prefers active cards", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-905"
        status="open"
        expectedEndOn="2026-09-23"
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase({
          production: [
            doc("po-2", "PO-918", "planned", { coveragePercent: 20 }),
            doc("po-1", "PO-905", "in_progress", { coveragePercent: 80 }),
          ],
        })}
        secondaryStages={[]}
      />,
    );

    const production = screen.getByRole("link", { name: /PO-905/i }).closest("li")?.parentElement;
    expect(production).toBeTruthy();
    const codes = within(production as HTMLElement)
      .getAllByText(/PO-/)
      .map((node) => node.textContent);
    expect(codes).toEqual(["PO-905", "PO-918"]);
    expect(screen.getByText("2 в работе")).toBeInTheDocument();
  });

  it("shows pending empty stages instead of omitting them", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-1"
        status="open"
        expectedEndOn={null}
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase()}
        secondaryStages={[]}
      />,
    );

    expect(screen.getAllByText("Не начато")).toHaveLength(4);
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Shipment")).toBeInTheDocument();
  });

  it("marks earlier empty stages as passed when only a later document is active", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-905"
        status="open"
        expectedEndOn="2026-09-23"
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase({
          transfer: [doc("tr-1", "TR-905", "sent", { coveragePercent: 100 })],
        })}
        secondaryStages={[]}
      />,
    );

    expect(screen.getAllByText("Пройдено")).toHaveLength(2);
    expect(screen.getByText("1 в работе")).toBeInTheDocument();
    expect(screen.getByText("TR-905")).toBeInTheDocument();
    expect(screen.getByText("Не начато")).toBeInTheDocument();
  });

  it("hides stage overflow menus and close action when the order is closed", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-2"
        status="closed"
        expectedEndOn="2026-09-01"
        canAct={false}
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase({
          production: [doc("po-1", "PO-1", "done", { coveragePercent: 100 })],
        })}
        secondaryStages={[]}
      />,
    );

    expect(screen.getByText("Закрыт")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Закрыть заказ клиента" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Действия: Production" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Действия: Shipment" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PO-1/i })).toBeInTheDocument();
  });

  it("shows unset deadline state when expected end is null", () => {
    render(
      <OrderProgressTracker
        orderNumber="OMS-3"
        status="open"
        expectedEndOn={null}
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={primaryBase()}
        secondaryStages={[]}
      />,
    );

    expect(screen.getByLabelText("Ожидаемое окончание")).toHaveValue("");
    expect(screen.getByTestId("expected-end-unset")).toHaveTextContent("Не задано");
  });

  it("lists stage ops actions in overflow and invokes the chosen action", async () => {
    const user = userEvent.setup();
    const onShip = vi.fn();
    const stages = primaryBase();
    stages[3] = {
      ...stages[3],
      actions: [{ label: "Ship", onClick: onShip }],
    };

    render(
      <OrderProgressTracker
        orderNumber="OMS-4"
        status="open"
        expectedEndOn="2026-10-01"
        canAct
        onCloseOrder={vi.fn()}
        onExpectedEndChange={vi.fn()}
        primaryStages={stages}
        secondaryStages={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Действия: Shipment" }));
    const shipItem = await screen.findByRole("menuitem", { name: "Ship" });
    await user.click(shipItem);
    expect(onShip).toHaveBeenCalledTimes(1);
  });
});
