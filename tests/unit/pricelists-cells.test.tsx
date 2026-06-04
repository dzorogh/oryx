import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollabUser } from "@/components/store/pim/pricelists/collab/collab-config";
import { PricelistsPresence } from "@/components/store/pim/pricelists/pricelists-presence";
import { PricelistPriceDualCell } from "@/components/store/pim/pricelists/pricelist-price-dual-cell";
import { PricelistParameterCell } from "@/components/store/pim/pricelists/pricelist-parameter-cell";
import { PricelistStatusCell } from "@/components/store/pim/pricelists/pricelist-status-cell";
import { PricelistRetailStatusCell } from "@/components/store/pim/pricelists/pricelist-retail-status-cell";
import { CURRENCY_USD_RATE } from "@/components/store/pim/pricelists/pricelists-helpers";

afterEach(() => cleanup());

const userA: CollabUser = {
  name: "Swift Otter",
  color: "#3b82f6",
  avatarUrl: "https://i.pravatar.cc/64?u=swift-otter",
};

describe("PricelistsPresence", () => {
  it("shows a live count and member avatar", () => {
    render(<PricelistsPresence users={[userA]} connected />);
    expect(screen.getByLabelText("Collaboration status: Live (1)")).toBeVisible();
    expect(screen.getByAltText("Swift Otter")).toBeVisible();
  });

  it("shows an overflow badge beyond the visible cap", () => {
    const users: CollabUser[] = Array.from({ length: 7 }, (_, i) => ({
      name: `User ${i}`,
      color: "#ef4444",
      avatarUrl: `https://i.pravatar.cc/64?u=user-${i}`,
    }));
    render(<PricelistsPresence users={users} connected />);
    expect(screen.getByText("+2")).toBeVisible();
  });

  it("reports offline when disconnected", () => {
    render(<PricelistsPresence users={[]} connected={false} />);
    expect(screen.getByLabelText("Collaboration status: Offline")).toBeVisible();
  });
});

const renderDualCell = (props: Partial<ComponentProps<typeof PricelistPriceDualCell>> = {}) =>
  render(
    <PricelistPriceDualCell
      value={{ amount: 100, currency: "USD" }}
      onChange={vi.fn()}
      onEditingChange={vi.fn()}
      editors={[]}
      displayCurrency="USD"
      onDisplayCurrencyChange={vi.fn()}
      ariaLabel="Dealer Price for Widget"
      {...props}
    />,
  );

describe("PricelistPriceDualCell", () => {
  it("clamps the source amount to zero and keeps the currency", () => {
    const onChange = vi.fn();
    renderDualCell({ onChange });

    fireEvent.change(screen.getByLabelText("Dealer Price for Widget"), { target: { value: "-5" } });

    expect(onChange).toHaveBeenCalledWith({ amount: 0, currency: "USD" });
  });

  it("shows the source price converted to a rounded USD amount", () => {
    renderDualCell({ value: { amount: 1000, currency: "CNY" }, ariaLabel: "Plant Price for Widget" });

    const usdInput = screen.getByLabelText<HTMLInputElement>("Plant Price for Widget in USD");
    expect(usdInput.value).toBe(String(Math.round(1000 * CURRENCY_USD_RATE.CNY)));
  });

  it("converts the display half into the chosen (non-USD) display currency", () => {
    renderDualCell({
      value: { amount: 1000, currency: "CNY" },
      displayCurrency: "EUR",
      ariaLabel: "Plant Price for Widget",
    });

    const displayInput = screen.getByLabelText<HTMLInputElement>("Plant Price for Widget in EUR");
    expect(displayInput.value).toBe(
      String(Math.round((1000 * CURRENCY_USD_RATE.CNY) / CURRENCY_USD_RATE.EUR)),
    );
  });

  it("converts an edited USD amount back into the source currency, keeping it", () => {
    const onChange = vi.fn();
    renderDualCell({ value: { amount: 1000, currency: "CNY" }, onChange, ariaLabel: "Plant Price for Widget" });

    fireEvent.change(screen.getByLabelText("Plant Price for Widget in USD"), { target: { value: "293" } });

    expect(onChange).toHaveBeenCalledWith({
      amount: Math.round(293 / CURRENCY_USD_RATE.CNY),
      currency: "CNY",
    });
  });

  it("emits editing presence on focus/blur and renders the active editor badge", () => {
    const onEditingChange = vi.fn();
    renderDualCell({ onEditingChange, editors: [userA], ariaLabel: "Retail Price for Widget" });

    const input = screen.getByLabelText("Retail Price for Widget");
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onEditingChange).toHaveBeenCalledWith(true);
    expect(onEditingChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("Swift Otter")).toBeVisible();
  });

  it("changes the per-cell price currency from the picker, keeping the amount", () => {
    const onChange = vi.fn();
    renderDualCell({ value: { amount: 1000, currency: "CNY" }, onChange, ariaLabel: "Plant Price for Widget" });

    fireEvent.click(screen.getByLabelText("Plant Price for Widget: choose price and display currency"));
    const priceGroup = screen.getByRole("group", { name: "Price currency" });
    fireEvent.click(within(priceGroup).getByText("EUR"));

    expect(onChange).toHaveBeenCalledWith({ amount: 1000, currency: "EUR" });
  });

  it("changes the global display currency from the picker", () => {
    const onDisplayCurrencyChange = vi.fn();
    renderDualCell({ onDisplayCurrencyChange, ariaLabel: "Plant Price for Widget" });

    fireEvent.click(screen.getByLabelText("Plant Price for Widget: choose price and display currency"));
    const displayGroup = screen.getByRole("group", { name: "Display currency" });
    fireEvent.click(within(displayGroup).getByText("EUR"));

    expect(onDisplayCurrencyChange).toHaveBeenCalledWith("EUR");
  });

  it("renders read-only prices as static source + display text without amount inputs", () => {
    renderDualCell({ value: { amount: 1000, currency: "CNY" }, isReadOnly: true });

    expect(screen.queryByLabelText("Dealer Price for Widget")).toBeNull();
    expect(screen.getByText("1,000 CNY")).toBeVisible();
    expect(screen.getByText(`${Math.round(1000 * CURRENCY_USD_RATE.CNY).toLocaleString("en-US")} USD`)).toBeVisible();
  });

  it("renders a plain divider without a currency picker in read-only cells", () => {
    renderDualCell({ value: { amount: 1000, currency: "CNY" }, isReadOnly: true });

    expect(
      screen.queryByLabelText("Dealer Price for Widget: choose price and display currency"),
    ).toBeNull();
  });
});

describe("PricelistParameterCell", () => {
  it("clears the override when the value matches the base", () => {
    const onSetOverride = vi.fn();
    const onClearOverride = vi.fn();
    render(
      <PricelistParameterCell
        value={450}
        isOverridden
        baseValue={300}
        parameterLabel="Customs (USD)"
        productName="Widget"
        editors={[]}
        ariaLabel="Customs for Widget"
        onEditingChange={vi.fn()}
        onSetOverride={onSetOverride}
        onClearOverride={onClearOverride}
      />,
    );

    const input = screen.getByLabelText("Customs for Widget");
    fireEvent.change(input, { target: { value: "300" } });

    expect(onClearOverride).toHaveBeenCalled();
    expect(onSetOverride).not.toHaveBeenCalled();
  });

  it("sets an override when the value differs from the base", () => {
    const onSetOverride = vi.fn();
    render(
      <PricelistParameterCell
        value={300}
        isOverridden={false}
        baseValue={300}
        parameterLabel="Customs (USD)"
        productName="Widget"
        editors={[]}
        ariaLabel="Customs for Widget"
        onEditingChange={vi.fn()}
        onSetOverride={onSetOverride}
        onClearOverride={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Customs for Widget");
    fireEvent.change(input, { target: { value: "450" } });

    expect(onSetOverride).toHaveBeenCalledWith(450);
  });

  it("clears the override when emptied", () => {
    const onClearOverride = vi.fn();
    render(
      <PricelistParameterCell
        value={450}
        isOverridden
        baseValue={300}
        parameterLabel="Customs (USD)"
        productName="Widget"
        editors={[]}
        ariaLabel="Customs for Widget"
        onEditingChange={vi.fn()}
        onSetOverride={vi.fn()}
        onClearOverride={onClearOverride}
      />,
    );

    const input = screen.getByLabelText("Customs for Widget");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onClearOverride).toHaveBeenCalled();
  });
});

describe("PricelistStatusCell", () => {
  it("renders the current status label and an editor badge", () => {
    render(
      <PricelistStatusCell
        value="available"
        onChange={vi.fn()}
        onEditingChange={vi.fn()}
        editors={[userA]}
        ariaLabel="Dealer status for Widget"
      />,
    );

    expect(screen.getByLabelText("Dealer status for Widget")).toBeVisible();
    expect(screen.getByText("Available")).toBeVisible();
    expect(screen.getByText("Swift Otter")).toBeVisible();
  });
});

describe("PricelistRetailStatusCell", () => {
  it("renders an editable select with the current label", () => {
    render(
      <PricelistRetailStatusCell
        value="available"
        ariaLabel="Retail status for Widget"
        onChange={vi.fn()}
        onEditingChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Retail status for Widget")).toBeVisible();
    expect(screen.getByText("Available for sale")).toBeVisible();
  });

  it("renders read-only text without a combobox", () => {
    render(<PricelistRetailStatusCell value="draft" ariaLabel="Retail status for Widget" readOnly />);

    expect(screen.getByText("Draft")).toBeVisible();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
