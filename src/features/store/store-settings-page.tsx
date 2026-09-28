// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  EDITABLE_ENTITY_CODE_FIELDS,
  ENTITY_CODE_PREFIX_SECTIONS,
  mergeEntityCodePrefixes,
  normalizeEntityCodePrefix,
  type EntityCodeKind,
  type EntityCodePrefixes,
} from "@/lib/entity-codes";
import { loadEntityCodePrefixes, saveEntityCodePrefixes } from "@/lib/entity-codes-api";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const STORE_PRODUCTS_HREF = "/store/pim/products";

const prefixesFromDraft = (draft: EntityCodePrefixes): EntityCodePrefixes =>
  mergeEntityCodePrefixes(draft);

export const StoreSettingsPage = () => {
  const configured = isSupabaseConfigured();
  const [draft, setDraft] = useState<EntityCodePrefixes>(() => mergeEntityCodePrefixes());
  const [saved, setSaved] = useState<EntityCodePrefixes>(() => mergeEntityCodePrefixes());
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase не настроен. Префиксы нельзя сохранить, пока не подключён демо-бэкенд.",
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
        const [codePrefixes, moneySettings] = await Promise.all([
          loadEntityCodePrefixes(),
          loadStoreMoneySettings(),
        ]);
        if (cancelled) {
          return;
        }
        setDraft(codePrefixes);
        setSaved(codePrefixes);
        setMoney(moneySettings);
        setError(null);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить префиксы.");
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

  const isDirty = useMemo(
    () => EDITABLE_ENTITY_CODE_FIELDS.some((field) => draft[field.entity] !== saved[field.entity]),
    [draft, saved],
  );

  const invalidKinds = useMemo(
    () =>
      EDITABLE_ENTITY_CODE_FIELDS.filter((field) => !normalizeEntityCodePrefix(draft[field.entity])).map(
        (field) => field.entity,
      ),
    [draft],
  );

  const updatePrefix = (kind: EntityCodeKind, value: string) => {
    setDraft((current) => ({
      ...current,
      [kind]: normalizeEntityCodePrefix(value),
    }));
  };

  const save = async () => {
    if (!configured || invalidKinds.length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      const next = await saveEntityCodePrefixes(prefixesFromDraft(draft));
      setDraft(next);
      setSaved(next);
      toast.success("Префиксы сохранены");
    } catch (caught: unknown) {
      toast.error("Не удалось сохранить префиксы", {
        description: caught instanceof Error ? caught.message : "Попробуйте ещё раз.",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            <CardHeader className="gap-0 space-y-3 pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Настройки</h1>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save()}
                  disabled={!configured || isLoading || isSaving || !isDirty || invalidKinds.length > 0}
                >
                  {isSaving ? "Сохранение…" : "Сохранить префиксы"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {error ? (
            <Alert variant={configured ? "destructive" : "default"}>
              <AlertTitle>{configured ? "Не удалось загрузить настройки" : "Демо-бэкенд недоступен"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
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
              {ENTITY_CODE_PREFIX_SECTIONS.map((section) => (
                <Card key={section.title} size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
                  <CardHeader className="gap-1">
                    <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {section.fields.map((field) => {
                        const prefix = draft[field.entity];
                        const example = prefix ? `${prefix}-${field.exampleId}` : "—";
                        const invalid = invalidKinds.includes(field.entity);
                        return (
                          <label key={field.entity} className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-foreground">{field.label}</span>
                            <Input
                              value={prefix}
                              onChange={(event) => updatePrefix(field.entity, event.target.value)}
                              aria-invalid={invalid}
                              aria-label={`Префикс: ${field.label}`}
                              autoCapitalize="characters"
                              autoComplete="off"
                              spellCheck={false}
                              maxLength={8}
                              disabled={!configured}
                            />
                            <span className="block text-xs text-muted-foreground">Пример {example}</span>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  );
};
