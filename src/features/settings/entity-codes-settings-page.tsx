"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EDITABLE_ENTITY_CODE_FIELDS,
  mergeEntityCodePrefixes,
  normalizeEntityCodePrefix,
  type EntityCodeKind,
  type EntityCodePrefixes,
} from "@/lib/entity-codes";
import { loadEntityCodePrefixes, saveEntityCodePrefixes } from "@/lib/entity-codes-api";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const EntityCodesSettingsPage = () => {
  const configured = isSupabaseConfigured();
  const [draft, setDraft] = useState<EntityCodePrefixes>(() => mergeEntityCodePrefixes());
  const [saved, setSaved] = useState<EntityCodePrefixes>(() => mergeEntityCodePrefixes());
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase не настроен. Префиксы нельзя сохранить, пока не подключён демо-бэкенд.",
  );

  useEffect(() => {
    if (!configured) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const codePrefixes = await loadEntityCodePrefixes();
        if (cancelled) {
          return;
        }
        setDraft(codePrefixes);
        setSaved(codePrefixes);
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
    setDraft((current) => ({ ...current, [kind]: normalizeEntityCodePrefix(value) }));
  };

  const save = async () => {
    if (!configured || invalidKinds.length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      const next = await saveEntityCodePrefixes(mergeEntityCodePrefixes(draft));
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

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Настройки</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Префиксы кодов</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
            <CardHeader className="gap-0 space-y-3 pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Префиксы кодов</h1>
                  <p className="text-xs text-muted-foreground">
                    Код в интерфейсе — префикс и номер. Смена префикса меняет только отображение.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save()}
                  disabled={!configured || isLoading || isSaving || !isDirty || invalidKinds.length > 0}
                >
                  {isSaving ? "Сохранение…" : "Сохранить"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {error ? (
            <Alert variant={configured ? "destructive" : "default"}>
              <AlertTitle>{configured ? "Не удалось загрузить префиксы" : "Демо-бэкенд недоступен"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {EDITABLE_ENTITY_CODE_FIELDS.map((field) => {
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
          )}
        </div>
      </section>
    </main>
  );
};
