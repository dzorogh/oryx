"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { TeamDirectoryToolbar } from "@/components/team/team-directory-toolbar";
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
      aria-label={`Open profile for ${employee.fullName}`}
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

  const handleOpenFilters = () => {
    setIsFilterSheetOpen(true);
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/team/structure" aria-label="Open Team section" />}>
                  Team
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <TeamDirectoryToolbar
            totalCount={TEAM_DIRECTORY_EMPLOYEES.length}
            filteredCount={filteredEmployees.length}
            hasActiveFilters={hasActiveFilters}
            onOpenFilters={handleOpenFilters}
          />

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Search and filter employees without reloading the page.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4 px-4 pb-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Search</span>
                  <div className="relative">
                    <Search
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Name, ID, department, position"
                      className="pl-8"
                      aria-label="Search employee by name, ID, or department"
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">District</span>
                  <Select value={districtFilter} onValueChange={(value) => setDistrictFilter(getSelectValue(value))}>
                    <SelectTrigger className="w-full" aria-label="Filter by district">
                      <SelectValue placeholder="All districts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All districts</SelectItem>
                      {districtOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Department</span>
                  <Select
                    value={departmentFilter}
                    onValueChange={(value) => setDepartmentFilter(getSelectValue(value))}
                  >
                    <SelectTrigger className="w-full" aria-label="Filter by department">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All departments</SelectItem>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Position</span>
                  <Select value={positionFilter} onValueChange={(value) => setPositionFilter(getSelectValue(value))}>
                    <SelectTrigger className="w-full" aria-label="Filter by position">
                      <SelectValue placeholder="All positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All positions</SelectItem>
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
                    Leads
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
                    aria-label="Reset all filters"
                  >
                    <X aria-hidden className="size-3.5" />
                    Reset
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
                    <TableHead className="px-3">Employee</TableHead>
                    <TableHead className="px-3">District and branch</TableHead>
                    <TableHead className="px-3">Department and divisions</TableHead>
                    <TableHead className="px-3">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No employees match the current filters.
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
                  No employees match the current filters.
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <article
                    key={employee.id}
                    className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3"
                    aria-label={`Employee card for ${employee.fullName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <EmployeeCell employee={employee} />
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">{employee.id}</span>
                    </div>

                    <div className="mt-3 grid gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          District and branch
                        </p>
                        <p className="pt-1 text-sm font-medium text-foreground">{employee.district}</p>
                        <p className="pt-0.5 text-xs text-muted-foreground">{employee.branch}</p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          Department and divisions
                        </p>
                        <p className="pt-1 text-sm font-medium text-foreground">{employee.department}</p>
                        <p className="pt-0.5 text-xs text-muted-foreground">{employee.divisions}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                            Position
                          </p>
                          <p className="pt-1 text-sm font-medium text-foreground">{employee.position}</p>
                        </div>

                        {employee.profileHref ? (
                          <Link
                            href={employee.profileHref}
                            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                            aria-label={`Open profile for ${employee.fullName}`}
                          >
                            Open profile
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
                  ? "No employees found for the current criteria."
                  : `Employees found: ${filteredEmployees.length}`}
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
};
