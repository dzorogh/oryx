"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TEAM_DIRECTORY_EMPLOYEES, type TeamDirectoryEmployee } from "./team-directory-demo-data";

const ALL_VALUE = "all";

const buildFilterOptions = (items: TeamDirectoryEmployee[], key: "district" | "department" | "position") =>
  Array.from(new Set(items.map((item) => item[key]))).sort((left, right) => left.localeCompare(right));

const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();

const getSelectValue = (value: string | null) => value ?? ALL_VALUE;

const matchesQuery = (employee: TeamDirectoryEmployee, query: string) => {
  if (!query) {
    return true;
  }

  const haystack = [
    employee.id,
    employee.fullName,
    employee.employeeRole,
    employee.branch,
    employee.department,
    employee.divisions,
    employee.position,
  ]
    .join(" ")
    .toLocaleLowerCase();

  return haystack.includes(query);
};

const EmployeeCell = ({ employee }: { employee: TeamDirectoryEmployee }) => {
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--corportal-border-grey)]">
        <Image
          src={employee.avatarUrl}
          alt={employee.fullName}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{employee.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{employee.employeeRole}</p>
      </div>
    </div>
  );

  if (!employee.profileHref) {
    return content;
  }

  return (
    <Link
      href={employee.profileHref}
      className="block rounded-lg outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Открыть профиль сотрудника ${employee.fullName}`}
    >
      {content}
    </Link>
  );
};

const StackedInfo = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="min-w-0">
    <p className="whitespace-normal text-sm font-medium text-foreground">{title}</p>
    <p className="pt-0.5 whitespace-normal text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
  </div>
);

export const TeamDirectoryPage = () => {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState(ALL_VALUE);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_VALUE);
  const [positionFilter, setPositionFilter] = useState(ALL_VALUE);
  const [showLeadsOnly, setShowLeadsOnly] = useState(false);

  const districtOptions = useMemo(
    () => buildFilterOptions(TEAM_DIRECTORY_EMPLOYEES, "district"),
    []
  );
  const departmentOptions = useMemo(
    () => buildFilterOptions(TEAM_DIRECTORY_EMPLOYEES, "department"),
    []
  );
  const positionOptions = useMemo(
    () => buildFilterOptions(TEAM_DIRECTORY_EMPLOYEES, "position"),
    []
  );

  const normalizedQuery = normalizeSearchValue(searchQuery);

  const filteredEmployees = useMemo(
    () =>
      TEAM_DIRECTORY_EMPLOYEES.filter((employee) => {
        if (!matchesQuery(employee, normalizedQuery)) {
          return false;
        }

        if (districtFilter !== ALL_VALUE && employee.district !== districtFilter) {
          return false;
        }

        if (departmentFilter !== ALL_VALUE && employee.department !== departmentFilter) {
          return false;
        }

        if (positionFilter !== ALL_VALUE && employee.position !== positionFilter) {
          return false;
        }

        if (showLeadsOnly && !employee.isLead) {
          return false;
        }

        return true;
      }),
    [departmentFilter, districtFilter, normalizedQuery, positionFilter, showLeadsOnly]
  );

  const hasActiveFilters =
    searchQuery.length > 0 ||
    districtFilter !== ALL_VALUE ||
    departmentFilter !== ALL_VALUE ||
    positionFilter !== ALL_VALUE ||
    showLeadsOnly;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDistrictFilter(ALL_VALUE);
    setDepartmentFilter(ALL_VALUE);
    setPositionFilter(ALL_VALUE);
    setShowLeadsOnly(false);
  };

  return (
    <main className="min-h-screen">
      <section className="flex items-start p-5">
        <div className="flex w-full max-w-7xl flex-col gap-4">
          <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <h1 className="text-lg font-semibold text-foreground">Сотрудники</h1>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Всего записей: {TEAM_DIRECTORY_EMPLOYEES.length}</span>
                  <span className="hidden text-[var(--corportal-border-grey)] sm:inline">•</span>
                  <span>Показано: {filteredEmployees.length}</span>
                </div>

                <Button
                  type="button"
                  variant={hasActiveFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsFilterSheetOpen(true)}
                  aria-label="Открыть фильтры сотрудников"
                >
                  <SlidersHorizontal aria-hidden className="size-3.5" />
                  Фильтры
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Фильтры</SheetTitle>
                <SheetDescription>
                  Поиск и отбор сотрудников без перезагрузки страницы.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4 px-4 pb-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Поиск</span>
                  <div className="relative">
                    <Search
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="ФИО, ID, подразделение, должность"
                      className="pl-8"
                      aria-label="Поиск сотрудника по имени, ID или подразделению"
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Округ</span>
                  <Select value={districtFilter} onValueChange={(value) => setDistrictFilter(getSelectValue(value))}>
                    <SelectTrigger className="w-full" aria-label="Фильтр по округу">
                      <SelectValue placeholder="Все округа" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Все округа</SelectItem>
                      {districtOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Отдел</span>
                  <Select
                    value={departmentFilter}
                    onValueChange={(value) => setDepartmentFilter(getSelectValue(value))}
                  >
                    <SelectTrigger className="w-full" aria-label="Фильтр по отделу">
                      <SelectValue placeholder="Все отделы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Все отделы</SelectItem>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Должность</span>
                  <Select value={positionFilter} onValueChange={(value) => setPositionFilter(getSelectValue(value))}>
                    <SelectTrigger className="w-full" aria-label="Фильтр по должности">
                      <SelectValue placeholder="Все должности" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Все должности</SelectItem>
                      {positionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowLeadsOnly((currentValue) => !currentValue)}
                    variant={showLeadsOnly ? "default" : "outline"}
                    size="sm"
                    aria-pressed={showLeadsOnly}
                  >
                    Руководители
                  </Button>
                </div>
              </div>

              <SheetFooter className="border-t bg-muted/30">
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    aria-label="Сбросить все фильтры"
                  >
                    <X aria-hidden className="size-3.5" />
                    Сбросить
                  </Button>
                ) : null}
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)]">
            <CardContent className="hidden px-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">ID</TableHead>
                    <TableHead className="px-3">Сотрудник</TableHead>
                    <TableHead className="px-3">Округ и филиал</TableHead>
                    <TableHead className="px-3">Отдел и подразделения</TableHead>
                    <TableHead className="px-3">Должность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                        По текущим фильтрам сотрудники не найдены.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="px-3 text-xs font-medium text-muted-foreground">
                          {employee.id}
                        </TableCell>
                        <TableCell className="px-3 whitespace-normal">
                          <EmployeeCell employee={employee} />
                        </TableCell>
                        <TableCell className="px-3 whitespace-normal">
                          <StackedInfo title={employee.district} subtitle={employee.branch} />
                        </TableCell>
                        <TableCell className="px-3 whitespace-normal">
                          <StackedInfo title={employee.department} subtitle={employee.divisions} />
                        </TableCell>
                        <TableCell className="px-3 whitespace-normal">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-sm font-medium text-foreground">{employee.position}</span>
                            <span className="text-xs text-muted-foreground">{employee.employeeRole}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            <CardContent className="space-y-3 md:hidden">
              {filteredEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--corportal-border-grey)] px-3 py-6 text-center text-sm text-muted-foreground">
                  По текущим фильтрам сотрудники не найдены.
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <article
                    key={employee.id}
                    className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3"
                    aria-label={`Карточка сотрудника ${employee.fullName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <EmployeeCell employee={employee} />
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">{employee.id}</span>
                    </div>

                    <div className="mt-3 grid gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          Округ и филиал
                        </p>
                        <p className="pt-1 text-sm font-medium text-foreground">{employee.district}</p>
                        <p className="pt-0.5 text-xs text-muted-foreground">{employee.branch}</p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          Отдел и подразделения
                        </p>
                        <p className="pt-1 text-sm font-medium text-foreground">{employee.department}</p>
                        <p className="pt-0.5 text-xs text-muted-foreground">{employee.divisions}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                            Должность
                          </p>
                          <p className="pt-1 text-sm font-medium text-foreground">{employee.position}</p>
                        </div>

                        {employee.profileHref ? (
                          <Link
                            href={employee.profileHref}
                            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                            aria-label={`Открыть профиль сотрудника ${employee.fullName}`}
                          >
                            Открыть профиль
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </CardContent>

            <CardFooter className="justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {filteredEmployees.length === 0
                  ? "По текущим условиям сотрудники не найдены."
                  : `Найдено сотрудников: ${filteredEmployees.length}`}
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
};
