"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildSubmittedData,
  deriveRequestTitle,
  findMissingRequiredFields,
  initialRequestFormValues,
  type RequestFieldValue,
  type RequestFormValues,
} from "@/features/tracker/requests/request-forms";
import { findRequestType } from "@/features/tracker/requests/requests-catalog";
import { catalogHref, myRequestsHref, REQUESTS_BASE_HREF } from "@/features/tracker/requests/requests-routes";
import { useRequestsStore } from "@/features/tracker/requests/requests-store";
import { RequestField } from "@/features/tracker/requests/ui/request-field";
import { RequestSectionIcon } from "@/features/tracker/requests/ui/request-section-icon";
import { RequestsPageShell } from "@/features/tracker/requests/ui/requests-page-shell";
import { RequestsToolbar } from "@/features/tracker/requests/ui/requests-toolbar";

export const RequestFormPage = ({ typeId }: { typeId: string }) => {
  const { submitRequest, catalog, getForm } = useRequestsStore();
  const location = findRequestType(typeId, catalog);
  const fields = getForm(typeId);
  const router = useRouter();
  const [values, setValues] = useState<RequestFormValues>(() => initialRequestFormValues(fields));
  const [errors, setErrors] = useState<string[]>([]);

  if (!location) {
    return (
      <RequestsPageShell breadcrumbs={[{ label: "Вид заявки не найден" }]}>
        <RequestsToolbar view="catalog" />
        <Card size="sm" className="items-start gap-3 p-6 ring-1 ring-[var(--corportal-border-grey)]">
          <p className="text-sm text-muted-foreground">Такого вида заявки нет в каталоге.</p>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={REQUESTS_BASE_HREF} />}>
            Открыть каталог
          </Button>
        </Card>
      </RequestsPageShell>
    );
  }

  const { section, subsection, type } = location;
  const backHref = catalogHref(section.id, subsection.id);

  const handleChange = (fieldId: string, value: RequestFieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => prev.filter((id) => id !== fieldId));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = findMissingRequiredFields(fields, values);
    if (missing.length > 0) {
      setErrors(missing);
      document
        .getElementById(`request-field-${missing[0]}-wrap`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Заполните обязательные поля");
      return;
    }

    const request = submitRequest({
      typeId: type.id,
      title: deriveRequestTitle(type.name, fields, values),
      assignee: subsection.team,
      data: buildSubmittedData(fields, values),
    });
    toast.success(`Заявка ${request.number} отправлена`);
    router.push(myRequestsHref({ id: request.id }));
  };

  return (
    <RequestsPageShell
      breadcrumbs={[
        { label: section.name, href: catalogHref(section.id) },
        { label: subsection.name, href: backHref },
        { label: type.name },
      ]}
    >
      <RequestsToolbar view="catalog" />

      <Card size="sm" className="px-5 py-6 ring-1 ring-[var(--corportal-border-grey)] sm:px-7">
        <form noValidate onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
          <div className="flex items-start gap-4 border-b border-[var(--corportal-border-grey)] pb-5">
            <RequestSectionIcon section={section} size="lg" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {section.name} · {subsection.name}
              </p>
              <h2 className="text-lg font-semibold text-foreground">{type.name}</h2>
              <p className="text-[13px] text-muted-foreground">{type.description}</p>
            </div>
          </div>

          {fields.map((field) => (
            <RequestField
              key={field.id}
              field={field}
              value={values[field.id]}
              error={errors.includes(field.id)}
              onChange={(value) => handleChange(field.id, value)}
            />
          ))}

          <div className="flex items-center gap-2 border-t border-[var(--corportal-border-grey)] pt-5">
            <Button type="submit">
              <Send aria-hidden />
              Отправить заявку
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={backHref} />}>
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    </RequestsPageShell>
  );
};
