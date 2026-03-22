"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Search } from "lucide-react";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { CONTAINER_DIMENSIONS } from "@/domain/packing/constants";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";
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
  `${item.width.toLocaleString("ru-RU")} × ${item.length.toLocaleString("ru-RU")} × ${item.height.toLocaleString("ru-RU")} мм`;

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
    <div className="space-y-6">
      <Card aria-label="Состав заказа">
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
              placeholder="Поиск по названию или ID"
              aria-label="Поиск по позициям заказа"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-md border">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Наименование</TableHead>
                  <TableHead scope="col">ID</TableHead>
                  <TableHead scope="col">Габариты, мм</TableHead>
                  <TableHead scope="col">Количество</TableHead>
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
                        Количество для {item.name}
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
                        aria-label={`Количество, ${item.name}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              Нет позиций, подходящих под поиск.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card aria-label="Load calculator">
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
          <CardTitle role="heading" aria-level={2}>
            Load calculator
          </CardTitle>
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Контейнер</span>
            <Select name="container-type" defaultValue={CONTAINER_LABEL}>
              <SelectTrigger size="sm" aria-label="Тип контейнера">
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
              aria-label="Выполняется расчёт упаковки"
            >
              <Spinner className="size-8 text-muted-foreground" aria-hidden focusable={false} />
            </div>
          ) : placementHasErrors && result ? (
            <div
              className="relative flex h-[min(680px,70vh)] w-full flex-col justify-center items-center overflow-auto rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:p-6"
              aria-label="Ошибки размещения: визуализация недоступна"
            >
              <Alert variant="destructive" className="max-w-md text-center">
                <AlertTitle>Ошибки размещения</AlertTitle>
              </Alert>
            </div>
          ) : hasContainers && result ? (
            <MultiContainerScene
              containers={result.containers}
              containerSize={CONTAINER_DIMENSIONS}
              orderItems={orderItems}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Нет контейнеров для отображения.</p>
          )}

          {result ? (
            <ResultPanel result={result} orderItems={orderItems} renderMs={renderMs} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
