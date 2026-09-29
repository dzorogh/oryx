"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  loadTenantSettings,
  setTenantRegion,
  type StoreRegionOption,
  type StoreTenantRow,
} from "@/features/logistics/logistics-api";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { getDemoTenantById } from "@/lib/demo-tenants";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const NO_REGION = "none";

/** Settings → Тенанты: one region per tenant; a customer order shows the tenants of its region. */
export const TenantsSettingsPage = () => {
  const configured = isSupabaseConfigured();
  const [tenants, setTenants] = useState<StoreTenantRow[]>([]);
  const [regions, setRegions] = useState<StoreRegionOption[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase не настроен. Регион тенанта нельзя сохранить, пока не подключён демо-бэкенд.",
  );

  useEffect(() => {
    if (!configured) {
      return;
    }
    let cancelled = false;
    void loadTenantSettings()
      .then((next) => {
        if (cancelled) return;
        setTenants(next.tenants);
        setRegions(next.regions);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Не удалось загрузить тенантов.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const regionItems = [
    { value: NO_REGION, label: "Без региона" },
    ...regions.map((region) => ({ value: region.id, label: region.code })),
  ];

  const changeRegion = async (tenant: StoreTenantRow, value: string) => {
    const regionId = value === NO_REGION ? null : value;
    if (regionId === tenant.regionId) return;
    setSavingId(tenant.id);
    try {
      await setTenantRegion(tenant.id, regionId);
      setTenants((current) => current.map((row) => (row.id === tenant.id ? { ...row, regionId } : row)));
      const code = regions.find((region) => region.id === regionId)?.code;
      toast.success(code ? `${tenant.name} — регион ${code}` : `${tenant.name} — без региона`);
    } catch (caught: unknown) {
      toast.error("Не удалось сохранить регион", {
        description: translateLogisticsError(caught instanceof Error ? caught.message : "Попробуйте ещё раз."),
      });
    } finally {
      setSavingId(null);
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
                <BreadcrumbPage>Тенанты</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
            <CardHeader className="gap-0 space-y-3 pb-0">
              <div>
                <h1 className="text-lg font-semibold text-foreground">Тенанты</h1>
                <p className="text-xs text-muted-foreground">
                  У тенанта один регион. Заказ клиента доступен тенантам своего региона — смена региона сразу
                  меняет тенанта в карточках заказов.
                </p>
              </div>
            </CardHeader>
          </Card>

          {error ? (
            <Alert variant={configured ? "destructive" : "default"}>
              <AlertTitle>{configured ? "Не удалось загрузить тенантов" : "Демо-бэкенд недоступен"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-14 pl-4" aria-label="Логотип" />
                      <TableHead>Тенант</TableHead>
                      <TableHead className="w-56 pr-4">Регион</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Тенантов нет.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenants.map((tenant) => {
                        const logo = getDemoTenantById(tenant.id)?.logo;
                        return (
                          <TableRow key={tenant.id}>
                            <TableCell className="pl-4">
                              <span className="relative block size-8 overflow-hidden rounded-md border border-[var(--corportal-border-grey)] bg-white">
                                {logo ? (
                                  <Image src={logo} alt="" fill sizes="32px" className="object-contain" />
                                ) : null}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell className="pr-4">
                              <Select
                                items={regionItems}
                                value={tenant.regionId ?? NO_REGION}
                                disabled={savingId === tenant.id || !configured}
                                onValueChange={(value) => {
                                  if (value) void changeRegion(tenant, String(value));
                                }}
                              >
                                <SelectTrigger className="h-8 w-44 bg-background" aria-label={`Регион ${tenant.name}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {regionItems.map((item) => (
                                      <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
};
