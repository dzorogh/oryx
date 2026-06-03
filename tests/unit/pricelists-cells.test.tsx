import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollabUser } from "@/components/store/pim/pricelists/collab/collab-config";
import { PricelistsPresence } from "@/components/store/pim/pricelists/pricelists-presence";
import { PricelistPriceCell } from "@/components/store/pim/pricelists/pricelist-price-cell";
import { PricelistParameterCell } from "@/components/store/pim/pricelists/pricelist-parameter-cell";
import { PricelistStatusCell } from "@/components/store/pim/pricelists/pricelist-status-cell";

afterEach(() => cleanup());

const userA: CollabUser = { name: "Swift Otter", color: "#3b82f6" };

describe("PricelistsPresence", () => {
  it("shows a live count and member initials", () => {
    render(<PricelistsPresence users={[userA]} connected />);
    expect(screen.getByLabelText("Collaboration status: Live (1)")).toBeVisible();
    expect(screen.getByText("SO")).toBeVisible();
  });

  it("shows an overflow badge beyond the visible cap", () => {
    const users: CollabUser[] = Array.from({ length: 7 }, (_, i) => ({
      name: `User ${i}`,
      color: "#ef4444",
    }));
    render(<PricelistsPresence users={users} connected />);
    expect(screen.getByText("+2")).toBeVisible();
  });

  it("reports offline when disconnected", () => {
    render(<PricelistsPresence users={[]} connected={false} />);
    expect(screen.getByLabelText("Collaboration status: Offline")).toBeVisible();
  });
});

describe("PricelistPriceCell", () => {
  it("clamps negative amounts to zero and keeps the currency", () => {
    const onChange = vi.fn();
    render(
      <PricelistPriceCell
        value={{ amount: 100, currency: "USD" }}
        onChange={onChange}
        onEditingChange={vi.fn()}
        editors={[]}
        ariaLabel="Dealer price for Widget"
      />,
    );

    const input = screen.getByLabelText("Dealer price for Widget");
    fireEvent.change(input, { target: { value: "-5" } });

    expect(onChange).toHaveBeenCalledWith({ amount: 0, currency: "USD" });
  });

  it("emits editing presence on focus and blur", () => {
    const onEditingChange = vi.fn();
    render(
      <PricelistPriceCell
        value={{ amount: 100, currency: "USD" }}
        onChange={vi.fn()}
        onEditingChange={onEditingChange}
        editors={[userA]}
        ariaLabel="Retail price for Widget"
      />,
    );

    const input = screen.getByLabelText("Retail price for Widget");
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onEditingChange).toHaveBeenCalledWith(true);
    expect(onEditingChange).toHaveBeenCalledWith(false);
    // Active editor name badge is rendered.
    expect(screen.getByText("Swift Otter")).toBeVisible();
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
    expect(screen.getByText("Available for sale")).toBeVisible();
    expect(screen.getByText("Swift Otter")).toBeVisible();
  });
});
