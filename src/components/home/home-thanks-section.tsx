"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMPLOYEE_OPTIONS } from "./thanks-demo-data";
import { HomeFormPanel } from "./home-form-panel";
import { HomeFieldSurface } from "./home-field-surface";

export const HomeThanksSection = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

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
        <label htmlFor="thanks-employee-select" className="text-sm font-semibold text-foreground">
          Найти сотрудника
        </label>
        <div className="pt-2">
          <Select
            value={selectedEmployeeId ?? ""}
            onValueChange={(value) => {
              setSelectedEmployeeId(value ?? null);
              setSent(false);
            }}
          >
            <SelectTrigger id="thanks-employee-select" className="w-full" aria-label="Выбрать сотрудника для благодарности">
              <SelectValue placeholder="Выберите сотрудника" />
            </SelectTrigger>
            <SelectContent align="start">
              {EMPLOYEE_OPTIONS.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </HomeFormPanel>

      <HomeFormPanel title="Благодарность">
        <div className="pt-2 text-sm text-muted-foreground">
          {selectedEmployee ? (
            <p>
              Получатель: <span className="font-medium text-foreground">{selectedEmployee.fullName}</span>
            </p>
          ) : (
            <p>Выберите сотрудника в списке выше.</p>
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
