"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CustomerOrderLine, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  createOrderPlan,
  launchOrderPlan,
  renameOrderPlan,
  setOrderPlanAction,
  setOrderPlanArchived,
} from "@/features/logistics/order-plan/order-plan-api";
import { formatDayMonthTime, OrderPlanBar } from "@/features/logistics/order-plan/order-plan-bar";
import { OrderPlanDetail } from "@/features/logistics/order-plan/order-plan-detail";
import {
  buildOwnerResolver,
  buildPlaceIndex,
  buildPlanSummary,
  buildProduceRows,
  buildProductPlans,
  buildSourceGroups,
  defaultPlanId,
  hasAction,
  planProblems,
  planStatus,
  pluralRu,
} from "@/features/logistics/order-plan/order-plan-model";
import { OrderPlanProducts } from "@/features/logistics/order-plan/order-plan-products";
import { OrderPlanSummary } from "@/features/logistics/order-plan/order-plan-summary";
import {
  mapOrderPlanPayload,
  type OrderPlanActionKey,
  type OrderPlanPayload,
} from "@/features/logistics/order-plan/order-plan-types";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { cn } from "@/lib/utils";

const PLAN_PARAM = "plan";

const readPlanParam = (): string | null =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(PLAN_PARAM);

const writePlanParam = (planId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (planId) {
    url.searchParams.set(PLAN_PARAM, planId);
  } else {
    url.searchParams.delete(PLAN_PARAM);
  }
  window.history.replaceState(window.history.state, "", url);
};

const errorText = (caught: unknown): string =>
  translateLogisticsError(caught instanceof Error ? caught.message : "Попробуйте ещё раз.");

const pad = (value: number) => String(value).padStart(2, "0");

const formatSavedAt = (iso: string): string => {
  const date = new Date(iso);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toDateString() === new Date().toDateString() ? time : formatDayMonthTime(iso);
};

type SaveState = { state: "idle" } | { state: "saving" } | { state: "error"; message: string };

export const OrderPlanTab = ({
  snapshot,
  orderId,
  lines,
  canAct,
  rawPlan,
  reload,
}: {
  snapshot: LogisticsSnapshot;
  orderId: string;
  lines: CustomerOrderLine[];
  canAct: boolean;
  rawPlan: unknown;
  reload: () => Promise<void>;
}) => {
  const [payload, setPayload] = useState<OrderPlanPayload>(() => mapOrderPlanPayload(rawPlan));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    const initial = mapOrderPlanPayload(rawPlan);
    const fromUrl = readPlanParam();
    return initial.plans.some((plan) => plan.id === fromUrl) ? fromUrl : defaultPlanId(initial.plans);
  });
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(lines[0]?.productId ?? null);
  const [save, setSave] = useState<SaveState>({ state: "idle" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const detailRef = useRef<HTMLDivElement>(null);

  const plan = payload.plans.find((item) => item.id === selectedPlanId) ?? null;
  const status = plan ? planStatus(plan) : null;
  const launched = Boolean(plan?.launchedAt);
  const editable = status === "draft" && canAct;

  const places = useMemo(() => buildPlaceIndex(snapshot), [snapshot]);
  const ownerOf = useMemo(() => buildOwnerResolver(snapshot), [snapshot]);
  const products = useMemo(
    () => buildProductPlans({ snapshot, lines, payload, plan, places }),
    [snapshot, lines, payload, plan, places],
  );
  const selected = products.find((product) => product.variantId === selectedVariantId) ?? products[0] ?? null;
  const groups = useMemo(
    () =>
      selected
        ? buildSourceGroups({ variantId: selected.variantId, payload, plan, places, ownerOf, onlyTaken: !editable })
        : [],
    [selected, payload, plan, places, ownerOf, editable],
  );
  const produce = useMemo(
    () =>
      selected
        ? buildProduceRows({
            snapshot,
            variantId: selected.variantId,
            plantId: selected.plantId,
            plan,
            places,
            onlyTaken: !editable,
          })
        : { existing: [], created: [], newPlantIds: [] },
    [selected, snapshot, plan, places, editable],
  );
  const summary = useMemo(
    () => buildPlanSummary({ snapshot, plan, products, places, ownerOf }),
    [snapshot, plan, products, places, ownerOf],
  );
  const problems = planProblems(products, launched);

  const selectPlan = useCallback((planId: string | null) => {
    setSelectedPlanId(planId);
    writePlanParam(planId);
  }, []);

  const selectProduct = (variantId: string) => {
    setSelectedVariantId(variantId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const setAction = (key: OrderPlanActionKey, quantity: number): Promise<void> => {
    const planId = plan?.id;
    if (!planId) {
      return Promise.resolve();
    }
    pending.current += 1;
    setSave({ state: "saving" });
    const run = queue.current.then(async () => {
      try {
        const next = await setOrderPlanAction(planId, key, quantity);
        setPayload(next);
        pending.current -= 1;
        if (pending.current === 0) {
          setSave({ state: "idle" });
        }
      } catch (caught) {
        pending.current -= 1;
        setSave({ state: "error", message: errorText(caught) });
      }
    });
    queue.current = run;
    return run;
  };

  const runPlanCommand = async (command: () => Promise<OrderPlanPayload>) => {
    try {
      setPayload(await command());
      return true;
    } catch (caught) {
      toast.error("Не удалось выполнить действие", { description: errorText(caught) });
      return false;
    }
  };

  const createPlan = async (copyFromPlanId: string | null) => {
    try {
      const created = await createOrderPlan({ customerOrderId: orderId, copyFromPlanId });
      setPayload(created.payload);
      selectPlan(created.planId);
      setSave({ state: "idle" });
    } catch (caught) {
      toast.error("Не удалось создать план", { description: errorText(caught) });
    }
  };

  const launch = async () => {
    if (!plan) {
      return;
    }
    setLaunching(true);
    try {
      await launchOrderPlan(plan.id);
      setConfirmOpen(false);
      toast.success(`«${plan.name}» запущен`);
    } catch (caught) {
      setConfirmOpen(false);
      toast.error("Не удалось запустить план", { description: errorText(caught) });
    } finally {
      setLaunching(false);
    }
    await reload();
  };

  const problemCount = problems.shortages + problems.excess;
  const launchDisabled =
    !canAct || save.state === "saving" || problemCount > 0 || !hasAction(plan) || launching;

  const footer = !plan ? null : status === "draft" ? (
    <>
      <div className="flex min-h-[18px] items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-zinc-500",
            save.state === "error" && "text-red-600",
          )}
        >
          <i
            aria-hidden
            className={cn("size-1.5 rounded-full bg-zinc-400", save.state === "error" && "bg-red-600")}
          />
          {save.state === "saving"
            ? "Сохраняется…"
            : save.state === "error"
              ? save.message
              : `Сохранено · ${formatSavedAt(plan.updatedAt)}`}
        </span>
        <span className="flex-1" />
        {problemCount > 0 ? (
          <button
            type="button"
            className="text-xs font-semibold whitespace-nowrap text-red-600 hover:underline"
            onClick={() => problems.firstVariantId && selectProduct(problems.firstVariantId)}
          >
            {problems.shortages > 0
              ? `${problems.shortages} ${pluralRu(problems.shortages, "нехватка", "нехватки", "нехваток")}`
              : null}
            {problems.shortages > 0 && problems.excess > 0 ? " · " : null}
            {problems.excess > 0 ? (
              <span className="text-amber-600">
                {problems.excess} {pluralRu(problems.excess, "лишнее", "лишних", "лишних")}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
      <Button type="button" className="h-9 w-full" disabled={launchDisabled} onClick={() => setConfirmOpen(true)}>
        Запустить
      </Button>
    </>
  ) : (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-9"
        onClick={() => void runPlanCommand(() => setOrderPlanArchived(plan.id, status !== "archived"))}
      >
        {status === "archived" ? "Вернуть из архива" : "В архив"}
      </Button>
      <Button type="button" className="h-9 flex-1" onClick={() => void createPlan(plan.id)}>
        Копировать в новый черновик
      </Button>
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {plan ? (
        <OrderPlanBar
          plans={payload.plans}
          current={plan}
          canCreate={canAct}
          onSelect={(planId) => selectPlan(planId)}
          onCreate={() => void createPlan(null)}
          onCopy={(planId) => void createPlan(planId)}
          onRename={(planId, name) => runPlanCommand(() => renameOrderPlan(planId, name))}
          onArchive={(planId, archived) => void runPlanCommand(() => setOrderPlanArchived(planId, archived))}
        />
      ) : null}

      {!plan ? (
        <Card size="sm" className={cn(logisticsCardClass, "items-center gap-3 py-10 text-center shadow-sm")}>
          <p className="text-sm text-muted-foreground">Планов пока нет</p>
          {canAct ? (
            <Button type="button" onClick={() => void createPlan(null)}>
              Новый план
            </Button>
          ) : null}
        </Card>
      ) : products.length === 0 ? (
        <Card size="sm" className={cn(logisticsCardClass, "items-center py-10 text-center shadow-sm")}>
          <p className="text-sm text-muted-foreground">В заказе нет товаров</p>
        </Card>
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[288px_minmax(0,1fr)_424px]">
          <OrderPlanProducts products={products} selectedId={selected?.variantId ?? null} onSelect={selectProduct} />
          <div ref={detailRef} className="min-w-0 scroll-mt-4">
            {selected ? (
              <OrderPlanDetail
                key={`${plan.id}:${selected.variantId}`}
                product={selected}
                groups={groups}
                produce={produce}
                launched={launched}
                editable={editable}
                onSet={setAction}
                snapshot={snapshot}
              />
            ) : null}
          </div>
          <div className="min-w-0 lg:col-span-2 xl:col-span-1 xl:self-stretch">
            <OrderPlanSummary
              summary={summary}
              selectedId={selected?.variantId ?? null}
              onSelect={selectProduct}
              footer={footer}
            />
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !launching && setConfirmOpen(open)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Запустить «{plan?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={launching}>Отмена</AlertDialogCancel>
            <Button type="button" disabled={launching} onClick={() => void launch()}>
              Запустить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
