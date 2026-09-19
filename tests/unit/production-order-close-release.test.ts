import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const MIGRATION = "supabase/migrations/20260918140000_logistics_close_production_order_release_holds.sql";

describe("production order close releases reserved holds", () => {
  const sql = read(MIGRATION);
  const page = read("src/features/logistics/production-orders-page.tsx");
  const docs = read("docs/features/logistics.md");

  it("releases residual reserved holds per customer order and location before write-off", () => {
    expect(sql).toContain("create or replace function public.store_close_production_order");
    expect(sql).toMatch(/if exists \(select 1 from public\.store_production_order where id = p_id and status = 'closed'\)/);
    expect(sql).toContain("select customer_order_id, location_id");
    expect(sql).toContain("stock_state = 'reserved'");
    expect(sql).toContain("'release'");
    expect(sql).toContain("'order_close'");
    expect(sql).toContain("'Production order closed'");
    expect(sql).toContain("perform public.store_post_reservation(v_res_id)");
    expect(sql).toContain("Cannot close a production order while reserved quantity remains");
    expect(
      translateLogisticsError("Cannot close a production order while reserved quantity remains"),
    ).toBe("Не удалось снять резерв при закрытии заказа на производство");
    expect(sql).toContain("and stock_state = 'free'");
    expect(sql).toContain("'production_close'");
    expect(sql.indexOf("store_post_reservation")).toBeLessThan(sql.indexOf("'production_close', p_id"));
    expect(sql).not.toMatch(/PO-2|RSV-11|transaction_id = 71/i);
  });

  it("tells the operator that holds were released when the production order closes", () => {
    expect(page).toContain("closeProductionOrder(order.id)");
    expect(page).toContain("Резервы сняты, заказ на производство закрыт");
  });

  it("documents close as release then free write-off", () => {
    expect(docs).toMatch(/Reservation в Free[\s\S]*свободный остаток/);
  });
});
