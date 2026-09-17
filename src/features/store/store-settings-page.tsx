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
  loadLogisticsSettings,
  saveLogisticsCodePrefixes,
} from "@/features/logistics/logistics-api";
import {
  DOCUMENT_PREFIX_FIELDS,
  mergeLogisticsCodePrefixes,
  normalizeLogisticsCodePrefix,
  type LogisticsCodeKind,
  type LogisticsCodePrefixes,
} from "@/features/logistics/logistics-codes";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const STORE_PRODUCTS_HREF = "/store/pim/products";

const prefixesFromDraft = (draft: Record<LogisticsCodeKind, string>): LogisticsCodePrefixes =>
  mergeLogisticsCodePrefixes(draft);

export const StoreSettingsPage = () => {
  const configured = isSupabaseConfigured();
  const [draft, setDraft] = useState<Record<LogisticsCodeKind, string>>(() => mergeLogisticsCodePrefixes());
  const [saved, setSaved] = useState<Record<LogisticsCodeKind, string>>(() => mergeLogisticsCodePrefixes());
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase is not configured. Prefixes cannot be saved until the demo backend is connected.",
  );

  useEffect(() => {
    if (!configured) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const settings = await loadLogisticsSettings();
        if (cancelled) {
          return;
        }
        setDraft(settings.codePrefixes);
        setSaved(settings.codePrefixes);
        setError(null);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load document prefixes.");
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
    () => DOCUMENT_PREFIX_FIELDS.some((field) => draft[field.kind] !== saved[field.kind]),
    [draft, saved],
  );

  const invalidKinds = useMemo(
    () =>
      DOCUMENT_PREFIX_FIELDS.filter((field) => !normalizeLogisticsCodePrefix(draft[field.kind])).map(
        (field) => field.kind,
      ),
    [draft],
  );

  const updatePrefix = (kind: LogisticsCodeKind, value: string) => {
    setDraft((current) => ({
      ...current,
      [kind]: normalizeLogisticsCodePrefix(value),
    }));
  };

  const save = async () => {
    if (!configured || invalidKinds.length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      const next = await saveLogisticsCodePrefixes(prefixesFromDraft(draft));
      setDraft(next.codePrefixes);
      setSaved(next.codePrefixes);
      toast.success("Document prefixes saved");
    } catch (caught: unknown) {
      toast.error("Could not save document prefixes", {
        description: caught instanceof Error ? caught.message : "Try again.",
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
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={STORE_PRODUCTS_HREF} aria-label="Open Store" />}>
                  Store
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
            <CardHeader className="gap-0 space-y-3 pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                  <p className="text-xs text-muted-foreground">
                    Document number prefixes for Store logistics. Codes stay automatic: prefix plus the integer id.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save()}
                  disabled={!configured || isLoading || isSaving || !isDirty || invalidKinds.length > 0}
                >
                  {isSaving ? "Saving…" : "Save prefixes"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {error ? (
            <Alert variant={configured ? "destructive" : "default"}>
              <AlertTitle>{configured ? "Could not load settings" : "Demo backend is offline"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
              <CardHeader className="gap-1">
                <h2 className="text-sm font-semibold text-foreground">Document prefixes</h2>
                <p className="text-xs text-muted-foreground">
                  Changing a prefix updates displayed codes immediately after save. Existing records keep the same
                  integer id.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {DOCUMENT_PREFIX_FIELDS.map((field) => {
                    const prefix = draft[field.kind];
                    const example = prefix ? `${prefix}-${field.exampleId}` : "—";
                    const invalid = invalidKinds.includes(field.kind);
                    return (
                      <label key={field.kind} className="space-y-1 text-sm">
                        <span className="font-medium text-foreground">{field.label}</span>
                        <Input
                          value={prefix}
                          onChange={(event) => updatePrefix(field.kind, event.target.value)}
                          aria-invalid={invalid}
                          aria-label={`${field.label} prefix`}
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={8}
                          disabled={!configured}
                        />
                        <span className="block text-xs text-muted-foreground">Example {example}</span>
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
