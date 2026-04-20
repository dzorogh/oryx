"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMPLOYEE_OPTIONS } from "./thanks-demo-data";
import { HomeFieldSurface } from "./home-field-surface";
import { HomeFormPanel } from "./home-form-panel";

export const HomeThanksSection = () => {
  const [query, setQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return EMPLOYEE_OPTIONS;
    }
    return EMPLOYEE_OPTIONS.filter((employee) => {
      const haystack = `${employee.fullName} ${employee.department} ${employee.role}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  const selectedEmployee = EMPLOYEE_OPTIONS.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const handleSubmit = () => {
    if (!selectedEmployee) {
      return;
    }
    setSent(true);
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <HomeFormPanel>
        <label htmlFor="thanks-search" className="text-sm font-semibold text-foreground">
          Найти сотрудника
        </label>
        <div className="relative pt-2">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-4 size-4 text-muted-foreground" />
          <HomeFieldSurface
            id="thanks-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Введите имя, отдел или роль"
            className="py-2 pl-9 pr-3"
            aria-label="Поиск сотрудника для благодарности"
          />
        </div>

        <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-[var(--corportal-border-grey)]">
          {filteredEmployees.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Сотрудники не найдены.</p>
          ) : (
            filteredEmployees.map((employee) => {
              const selected = selectedEmployeeId === employee.id;
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeId(employee.id);
                    setSent(false);
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--corportal-border-grey)] px-3 py-2 text-left transition-colors last:border-b-0 ${
                    selected ? "bg-muted" : "hover:bg-muted/70"
                  }`}
                  aria-label={`Выбрать сотрудника ${employee.fullName}`}
                >
                  <span className="text-sm font-medium text-foreground">{employee.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {employee.department} · {employee.role}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </HomeFormPanel>

      <HomeFormPanel title="Благодарность">
        <div className="pt-2 text-sm text-muted-foreground">
          {selectedEmployee ? (
            <p>
              Получатель: <span className="font-medium text-foreground">{selectedEmployee.fullName}</span>
            </p>
          ) : (
            <p>Выберите сотрудника из списка слева.</p>
          )}
        </div>

        <label htmlFor="thanks-message" className="mt-3 block text-xs font-medium text-muted-foreground">
          Текст благодарности
        </label>
        <HomeFieldSurface
          as="textarea"
          id="thanks-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setSent(false);
          }}
          placeholder="Например: Спасибо за помощь с релизом, очень выручил(а) команду!"
          className="mt-1 min-h-28 px-3 py-2"
          aria-label="Текст благодарности сотруднику"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedEmployee || !message.trim()}
            aria-label="Отправить благодарность"
          >
            Отправить спасибо
          </Button>
          {sent ? <p className="text-xs text-primary">Спасибо отправлено (mock).</p> : null}
        </div>
      </HomeFormPanel>
    </div>
  );
};
