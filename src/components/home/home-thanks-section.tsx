"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMPLOYEE_OPTIONS } from "./thanks-demo-data";

export const HomeThanksSection = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!selectedEmployeeId || !message.trim()) {
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={selectedEmployeeId ?? ""}
        onValueChange={(value) => {
          setSelectedEmployeeId(value ?? null);
          setSent(false);
        }}
      >
        <SelectTrigger id="thanks-employee-select" className="w-full" aria-label="Выбрать сотрудника">
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

      <Input
        id="thanks-message"
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setSent(false);
        }}
        placeholder="Например: Спасибо за помощь с релизом!"
        aria-label="Текст благодарности"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!selectedEmployeeId || !message.trim()}
          aria-label="Отправить благодарность"
        >
          Отправить
        </Button>
        {sent ? <p className="text-xs text-primary">Спасибо отправлено</p> : null}
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        Вы можете сказать Спасибо любому сотруднику раз в месяц
      </p>
    </div>
  );
};
