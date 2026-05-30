"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Search } from "lucide-react";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { CONTAINER_DIMENSIONS, getOrderPresetById } from "@/domain/packing/constants";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderViewSectionProps = {
  orderItems: OrderItemType[];
  result: PackingResult | null;
  isPackingLoading: boolean;
  onQuantityChange: (lineIndex: number, quantity: number) => void;
  renderMs: number | null;
};

const CONTAINER_LABEL = "40HC";

const formatDimensions = (item: OrderItemType) =>
  `${item.width.toLocaleString("en-US")} × ${item.length.toLocaleString("en-US")} × ${item.height.toLocaleString("en-US")} mm`;

export const OrderViewSection = ({
  orderItems,
  result,
  isPackingLoading,
  onQuantityChange,
  renderMs,
}: OrderViewSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return orderItems
      .map((item, lineIndex) => ({ item, lineIndex }))
      .filter(({ item }) => {
        if (!normalizedQuery) return true;
        const hay = `${item.name} ${item.id}`.toLowerCase();
        return hay.includes(normalizedQuery);
      });
  }, [orderItems, searchQuery]);

  const hasContainers = Boolean(result && result.containers.length > 0);
  const placementHasErrors = Boolean(result && !isPackingPlacementValid(result.validation));

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleQuantityInputChange = (lineIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const parsed = event.target.valueAsNumber;
    if (Number.isNaN(parsed)) {
      return;
    }
    onQuantityChange(lineIndex, parsed);
  };

  return (
    <div className="space-y-4">
      <Card
        aria-label="Order composition"
      >
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle role="heading" aria-level={2}>
            Ordered Products
          </CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <Input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name or ID"
              aria-label="Search order line items"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-md border">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">ID</TableHead>
                  <TableHead scope="col">Dimensions, mm</TableHead>
                  <TableHead scope="col">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ item, lineIndex }) => (
                  <TableRow key={String(lineIndex)}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDimensions(item)}</TableCell>
                    <TableCell>
                      <label className="sr-only" htmlFor={`qty-${lineIndex}`}>
                        Quantity for {item.name}
                      </label>
                      <Input
                        id={`qty-${lineIndex}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={9_999_999}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => handleQuantityInputChange(lineIndex, e)}
                        className="w-24 text-right"
                        aria-label={`Quantity, ${item.name}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              No line items match your search.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card
        aria-label="Load calculator"
      >
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
          <CardTitle role="heading" aria-level={2}>
            Load calculator
          </CardTitle>
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Container</span>
            <Select name="container-type" defaultValue={CONTAINER_LABEL}>
              <SelectTrigger size="sm" aria-label="Container type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONTAINER_LABEL}>{CONTAINER_LABEL}</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {isPackingLoading ? (
            <div
              className={cn(
                "relative h-[min(680px,70vh)]",
                "flex items-center justify-center",
              )}
              role="status"
              aria-live="polite"
              aria-label="Packing calculation in progress"
            >
              <Spinner className="size-8 text-muted-foreground" aria-hidden focusable={false} />
            </div>
          ) : placementHasErrors && result ? (
            <div
              className="relative flex h-[min(680px,70vh)] w-full flex-col justify-center items-center overflow-auto rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:p-6"
              aria-label="Placement errors: visualization unavailable"
            >
              <Alert variant="destructive" className="max-w-md text-center">
                <AlertTitle>Placement errors</AlertTitle>
              </Alert>
            </div>
          ) : hasContainers && result ? (
            <MultiContainerScene
              containers={result.containers}
              containerSize={CONTAINER_DIMENSIONS}
              orderItems={orderItems}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No containers to display.</p>
          )}

          {result ? (
            <ResultPanel result={result} orderItems={orderItems} renderMs={renderMs} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

type OrderPackingDynamicContentProps = {
  selectedOrderId: number;
};

export const OrderPackingDynamicContent = ({ selectedOrderId }: OrderPackingDynamicContentProps) => {
  const activeOrderPreset = useMemo(() => getOrderPresetById(selectedOrderId), [selectedOrderId]);
  const [orderItems, setOrderItems] = useState(() => structuredClone(activeOrderPreset.order));
  const { result, error, isLoading } = usePackingResult(selectedOrderId, orderItems);
  const [renderMs, setRenderMs] = useState<number | null>(null);

  const handleQuantityChange = (lineIndex: number, quantity: number) => {
    const safe = Math.max(0, Math.min(9_999_999, Math.floor(Number.isFinite(quantity) ? quantity : 0)));
    setOrderItems((prev) => prev.map((item, i) => (i === lineIndex ? { ...item, quantity: safe } : item)));
  };

  useEffect(() => {
    if (error || !result || !isPackingPlacementValid(result.validation)) {
      queueMicrotask(() => {
        setRenderMs(null);
      });
      return;
    }

    const renderStartedAt = performance.now();
    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setRenderMs(performance.now() - renderStartedAt);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [error, result]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6" aria-label="Packing calculation error">
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <div className="flex-1 px-4 pb-6 sm:px-6">
      <OrderViewSection
        orderItems={orderItems}
        result={result}
        isPackingLoading={isLoading}
        onQuantityChange={handleQuantityChange}
        renderMs={renderMs}
      />
    </div>
  );
};
