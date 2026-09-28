// english-ui:ignore-file
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadStoreMoneySettings, saveProductionCurrency, type StoreMoneySettings } from "@/features/logistics/logistics-api";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const STORE_PRODUCTS_HREF = "/store/pim/products";

export const StoreSettingsPage = () => {
  const configured = isSupabaseConfigured();
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase не настроен. Настройки нельзя сохранить, пока не подключён демо-бэкенд.",
  );
  const [money, setMoney] = useState<StoreMoneySettings>({ productionCurrencyCode: null, currencies: [] });
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);

  useEffect(() => {
    if (!configured) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const moneySettings = await loadStoreMoneySettings();
        if (cancelled) {
          return;
        }
        setMoney(moneySettings);
        setError(null);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить настройки.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const changeProductionCurrency = async (code: string) => {
    if (!configured || code === money.productionCurrencyCode) {
      return;
    }
    setIsSavingCurrency(true);
    try {
      await saveProductionCurrency(code);
      setMoney((current) => ({ ...current, productionCurrencyCode: code }));
      toast.success(`Валюта производств — ${code}`);
    } catch (caught: unknown) {
      toast.error("Не удалось сохранить валюту производств", {
        description: caught instanceof Error ? caught.message : "Попробуйте ещё раз.",
      });
    } finally {
      setIsSavingCurrency(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={STORE_PRODUCTS_HREF} aria-label="Открыть магазин" />}>
                  Магазин
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Настройки</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
            <CardHeader className="gap-0 pb-0">
              <h1 className="text-lg font-semibold text-foreground">Настройки</h1>
            </CardHeader>
          </Card>

          {error ? (
            <Alert variant={configured ? "destructive" : "default"}>
              <AlertTitle>{configured ? "Не удалось загрузить настройки" : "Демо-бэкенд недоступен"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
              <CardHeader className="gap-1">
                <h2 className="text-sm font-semibold text-foreground">Валюта производств</h2>
                <p className="text-xs text-muted-foreground">
                  Валюта новых заказов на производство и всех сумм календаря производства. Сохраняется сразу.
                </p>
              </CardHeader>
              <CardContent>
                <label className="flex max-w-xs flex-col gap-1 text-sm">
                  <span className="font-medium text-foreground">Валюта</span>
                  <Select
                    items={money.currencies.map((currency) => ({
                      value: currency.code,
                      label: `${currency.code} · ${currency.name}`,
                    }))}
                    value={money.productionCurrencyCode}
                    disabled={!configured || isSavingCurrency || money.currencies.length === 0}
                    onValueChange={(value) => {
                      if (value) void changeProductionCurrency(value);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background" aria-label="Валюта производств">
                      <SelectValue placeholder="Выберите валюту" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {money.currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} · {currency.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
};
