import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_MY_REQUESTS,
  filterMyRequests,
  nextRequestNumber,
  parseRequestsFilter,
} from "@/features/tracker/requests/my-requests";
import {
  buildSubmittedData,
  deriveRequestTitle,
  findMissingRequiredFields,
  formatFieldValue,
  getRequestForm,
  initialRequestFormValues,
  REQUEST_FORMS,
} from "@/features/tracker/requests/request-forms";
import {
  findRequestType,
  REQUEST_CATALOG,
  resolveCatalogSelection,
  searchRequestTypes,
} from "@/features/tracker/requests/requests-catalog";
import { formatCount } from "@/features/tracker/requests/ui/format-count";
import {
  createBuilderField,
  createStarterFields,
  duplicateField,
  finalizeFields,
  hasDraftIssues,
  insertField,
  moveField,
  validateDraft,
} from "@/features/tracker/requests/request-builder";
import { withCustomTypes } from "@/features/tracker/requests/requests-catalog";

describe("request form builder", () => {
  it("gives new fields unique ids and sensible defaults", () => {
    const starter = createStarterFields();
    const radio = createBuilderField("radio", starter);
    assert.equal(radio.id, "field-4");
    assert.ok(radio.type === "radio" && radio.options.length === 2 && radio.defaultValue === "Вариант 1");
    const person = createBuilderField("person", [...starter, radio]);
    assert.ok(person.type === "person" && person.defaultValue === "Я");
    assert.equal(person.id, "field-5");
  });

  it("inserts after the selected field, moves and duplicates", () => {
    const starter = createStarterFields();
    const date = createBuilderField("date", starter);
    const inserted = insertField(starter, date, "field-1");
    assert.deepEqual(inserted.map((field) => field.id), ["field-1", date.id, "field-2", "field-3"]);
    assert.deepEqual(insertField(starter, date, null).at(-1)?.id, date.id);

    assert.deepEqual(moveField(starter, "field-3", 0).map((field) => field.id), ["field-3", "field-1", "field-2"]);
    assert.deepEqual(moveField(starter, "field-1", 99).map((field) => field.id), ["field-2", "field-3", "field-1"]);

    const { fields, copyId } = duplicateField(starter, "field-1");
    assert.equal(fields[1].id, copyId);
    assert.equal(fields[1].label, "Тема (копия)");
  });

  it("flags drafts an employee could not use", () => {
    const empty = validateDraft({ name: " ", description: "", sectionId: "it", subsectionId: "portal", fields: [] });
    assert.ok(empty.name && empty.fields && hasDraftIssues(empty));

    const select = { id: "kind", type: "select" as const, label: "Тип", options: ["Один", "  "] };
    const unnamed = { id: "blank", type: "text" as const, label: "" };
    const issues = validateDraft({ name: "Визитки", description: "", sectionId: "it", subsectionId: "portal", fields: [select, unnamed] });
    assert.equal(issues.name, undefined);
    assert.deepEqual(Object.keys(issues.byField).sort(), ["blank", "kind"]);

    const ok = validateDraft({ name: "Визитки", description: "", sectionId: "it", subsectionId: "portal", fields: createStarterFields() });
    assert.equal(hasDraftIssues(ok), false);
  });

  it("cleans options and drops a default that no longer exists", () => {
    const [radio] = finalizeFields([
      { id: "r", type: "radio", label: " Тираж ", options: ["100", " 200 ", "", "100"], defaultValue: "500" },
    ]);
    assert.ok(radio.type === "radio");
    assert.equal(radio.label, "Тираж");
    assert.deepEqual(radio.options, ["100", "200"]);
    assert.equal(radio.defaultValue, undefined);
  });

  it("adds published types to the end of their subsection", () => {
    const catalog = withCustomTypes(REQUEST_CATALOG, [
      { sectionId: "marketing", subsectionId: "merch", type: { id: "custom-1", name: "Визитки", description: "", custom: true } },
    ]);
    assert.equal(findRequestType("custom-1", catalog)?.subsection.id, "merch");
    assert.equal(findRequestType("custom-1"), null);
    assert.ok(searchRequestTypes("визитки", catalog).some((item) => item.type.id === "custom-1"));
    assert.equal(withCustomTypes(REQUEST_CATALOG, []), REQUEST_CATALOG);
  });
});

describe("requests catalog", () => {
  it("has unique type ids and a form schema only for known types", () => {
    const ids = REQUEST_CATALOG.flatMap((section) => section.subsections.flatMap((sub) => sub.types.map((type) => type.id)));
    assert.equal(new Set(ids).size, ids.length);
    for (const typeId of Object.keys(REQUEST_FORMS)) {
      assert.ok(findRequestType(typeId), `form for unknown type ${typeId}`);
    }
  });

  it("falls back to the first section and subsection for unknown ids", () => {
    const fallback = resolveCatalogSelection("nope", null);
    assert.equal(fallback.section.id, "it");
    assert.equal(fallback.subsection.id, "portal");
    const hr = resolveCatalogSelection("hr", "leave");
    assert.equal(hr.subsection.name, "Отпуска и отсутствия");
    assert.equal(resolveCatalogSelection("hr", "portal").subsection.id, "docs");
  });

  it("searches by every word across type, subsection and section names, ignoring ё", () => {
    assert.deepEqual(searchRequestTypes("   "), []);
    assert.ok(searchRequestTypes("vpn").some((item) => item.type.id === "sec-vpn"));
    assert.ok(searchRequestTypes("отчет доработка").some((item) => item.type.id === "bi-change"));
    assert.ok(searchRequestTypes("пропуск гость").every((item) => item.subsection.id === "passes"));
  });
});

describe("request forms", () => {
  it("uses the default form for types without their own schema", () => {
    assert.equal(getRequestForm("off-clean")[0].id, "subject");
  });

  it("reports missing required fields per field type", () => {
    const fields = getRequestForm("sec-vpn");
    const values = initialRequestFormValues(fields);
    assert.equal(values.who, "Я");
    assert.deepEqual(findMissingRequiredFields(fields, values), ["period", "policy"]);
    values.period = { from: "2026-10-20", to: "" };
    values.policy = true;
    assert.deepEqual(findMissingRequiredFields(fields, values), ["period"]);
    values.period = { from: "2026-10-20", to: "2026-11-20" };
    assert.deepEqual(findMissingRequiredFields(fields, values), []);
  });

  it("formats values for the read-only request view", () => {
    const fields = getRequestForm("pay-invoice");
    const byId = (id: string) => fields.find((field) => field.id === id)!;
    assert.equal(formatFieldValue(byId("amount"), "184500"), "184\u00a0500 ₽");
    assert.equal(formatFieldValue(byId("due"), "2026-10-12"), "12.10.2026");
    assert.equal(formatFieldValue(byId("urgent"), false), "Нет");
    assert.equal(formatFieldValue(byId("purpose"), "  "), null);
  });

  it("builds submitted data without empty fields and keeps file names", () => {
    const fields = getRequestForm("portal-bug");
    const values = initialRequestFormValues(fields);
    values.title = "Не открывается профиль";
    values.steps = "1. Открыть профиль";
    values.files = ["screen.png"];
    const data = buildSubmittedData(fields, values);
    assert.deepEqual(
      data.map((item) => item.label),
      ["Что сломалось", "Шаги воспроизведения", "Насколько мешает", "Скриншот или видео"],
    );
    assert.deepEqual(data.at(-1)?.files, ["screen.png"]);
    assert.equal(deriveRequestTitle("Баг", fields, values), "Не открывается профиль");
    assert.equal(deriveRequestTitle("Баг", fields, initialRequestFormValues(fields)), "Баг");
  });
});

describe("my requests", () => {
  it("filters by status group and query", () => {
    assert.ok(filterMyRequests(DEMO_MY_REQUESTS, "active", "").every((item) => !["done", "rejected"].includes(item.status)));
    assert.ok(filterMyRequests(DEMO_MY_REQUESTS, "closed", "").every((item) => ["done", "rejected"].includes(item.status)));
    assert.deepEqual(filterMyRequests(DEMO_MY_REQUESTS, "all", "2475").map((item) => item.id), ["2475"]);
    assert.equal(parseRequestsFilter("bogus"), "active");
  });

  it("numbers new requests after the largest existing one", () => {
    assert.equal(nextRequestNumber(DEMO_MY_REQUESTS), 2482);
    assert.equal(nextRequestNumber([]), 1);
  });

  it("pluralizes counts in Russian", () => {
    assert.equal(formatCount(1, ["поле", "поля", "полей"]), "1 поле");
    assert.equal(formatCount(3, ["поле", "поля", "полей"]), "3 поля");
    assert.equal(formatCount(12, ["поле", "поля", "полей"]), "12 полей");
    assert.equal(formatCount(22, ["поле", "поля", "полей"]), "22 поля");
  });
});
