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
