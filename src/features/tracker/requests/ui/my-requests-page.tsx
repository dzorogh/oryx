"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CornerDownRight, Paperclip } from "lucide-react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  filterMyRequests,
  matchesRequestsFilter,
  MY_REQUESTS_FILTERS,
  parseRequestsFilter,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_SHORT_LABELS,
  type MyRequest,
} from "@/features/tracker/requests/my-requests";
import { findRequestType } from "@/features/tracker/requests/requests-catalog";
import { myRequestsHref, REQUESTS_BASE_HREF } from "@/features/tracker/requests/requests-routes";
import { useRequestsStore } from "@/features/tracker/requests/requests-store";
import { requestPersonAvatar, TEXTAREA_CLASS_NAME } from "@/features/tracker/requests/ui/request-field";
import { RequestStatusDot } from "@/features/tracker/requests/ui/request-section-icon";
import { RequestsPageShell } from "@/features/tracker/requests/ui/requests-page-shell";
import { RequestsToolbar } from "@/features/tracker/requests/ui/requests-toolbar";
import { cn } from "@/lib/utils";

const CARD_RING = "ring-1 ring-[var(--corportal-border-grey)]";

const RequestDetail = ({ request }: { request: MyRequest }) => {
  const { addComment, catalog } = useRequestsStore();
  const [draft, setDraft] = useState("");
  const location = findRequestType(request.typeId, catalog);
  const commentsCount = request.events.filter((event) => event.kind === "comment").length;
  const canComment = request.status !== "rejected";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addComment(request.id, text);
    setDraft("");
  };

  return (
    <Card size="sm" className={cn("gap-0 py-0", CARD_RING)}>
      <div className="flex flex-col gap-2.5 border-b border-[var(--corportal-border-grey)] px-5 pt-5 pb-4">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <RequestStatusDot status={request.status} />
          <span className="text-foreground/80">{REQUEST_STATUS_LABELS[request.status]}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{request.number}</span>
        </p>
        <h2 className="text-lg leading-snug font-semibold text-foreground">{request.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {location ? (
            <span>
              {location.section.name} › {location.subsection.name} › {location.type.name}
            </span>
          ) : null}
          <span>
            Исполнитель: <span className="text-foreground/80">{request.assignee}</span>
          </span>
          <span>
            Создана: <span className="text-foreground/80">{request.createdAt}</span>
          </span>
          {request.dueAt ? (
            <span>
              Срок: <span className="text-foreground/80">{request.dueAt}</span>
            </span>
          ) : null}
        </div>
        {request.waitingNote ? (
          <p className="mt-1 flex gap-2.5 rounded-lg border border-[var(--corportal-border-grey)] bg-muted/40 px-3 py-2.5 text-[13px] text-foreground/80">
            <CornerDownRight aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {request.waitingNote}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="request-data-title" className="border-b border-[var(--corportal-border-grey)] px-5 py-4">
        <h3 id="request-data-title" className="mb-3 text-sm font-semibold text-foreground">
          Данные заявки
        </h3>
        {request.data.length > 0 ? (
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:gap-y-3">
            {request.data.map((item) => (
              <div key={item.label} className="contents">
                <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
                <dd className="mb-2 text-sm whitespace-pre-line text-foreground sm:mb-0">
                  {item.files ? (
                    <span className="flex flex-wrap gap-1.5">
                      {item.files.map((file) => (
                        <span
                          key={file}
                          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] px-2 text-xs"
                        >
                          <Paperclip aria-hidden className="size-3.5 text-muted-foreground" />
                          {file}
                        </span>
                      ))}
                    </span>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Поля формы не заполнены.</p>
        )}
      </section>

      <section aria-labelledby="request-thread-title" className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <h3 id="request-thread-title" className="text-sm font-semibold text-foreground">
          Обсуждение
          {commentsCount > 0 ? (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{commentsCount}</span>
          ) : null}
        </h3>
        <ol className="flex flex-col gap-4">
          {request.events.map((event) =>
            event.kind === "system" ? (
              <li key={event.id} className="pl-10 text-xs text-muted-foreground/80">
                {event.text}
              </li>
            ) : (
              <li key={event.id} className="flex gap-3">
                <Image
                  src={requestPersonAvatar(event.author ?? "me")}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full"
                />
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 text-[13px]">
                    <span className="font-medium text-foreground">{event.author ?? "Вы"}</span>
                    <span className="text-xs text-muted-foreground/80">{event.at}</span>
                  </p>
                  <p className="max-w-3xl text-sm whitespace-pre-line text-foreground/85">{event.text}</p>
                </div>
              </li>
            ),
          )}
        </ol>
        {canComment ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-xl border border-[var(--corportal-border-grey)] p-2"
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={request.waitingNote ? "Ответьте исполнителю…" : "Написать комментарий…"}
              aria-label="Комментарий к заявке"
              rows={2}
              className={cn(TEXTAREA_CLASS_NAME, "min-h-14 resize-none border-0 px-1.5 focus-visible:ring-0")}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={draft.trim() === ""}>
                Отправить
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </Card>
  );
};

export const MyRequestsPage = () => {
  const searchParams = useSearchParams();
  const filter = parseRequestsFilter(searchParams.get("filter"));
  const selectedId = searchParams.get("id");
  const { requests, markRead, catalog } = useRequestsStore();
  const [query, setQuery] = useState("");

  const list = filterMyRequests(requests, filter, query);
  const selected = list.find((request) => request.id === selectedId) ?? list[0] ?? null;
  const selectedRequestId = selected?.id;

  useEffect(() => {
    if (selectedRequestId) markRead(selectedRequestId);
  }, [selectedRequestId, markRead]);

  return (
    <RequestsPageShell breadcrumbs={[{ label: "Мои заявки" }]}>
      <RequestsToolbar view="my" search={{ value: query, onChange: setQuery, placeholder: "Номер или тема" }}>
        <div className="flex flex-wrap gap-2" aria-label="Фильтр заявок">
          {MY_REQUESTS_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={filter === item.id}
              nativeButton={false}
              render={<Link href={myRequestsHref({ filter: item.id })} />}
            >
              {item.label} ({requests.filter((request) => matchesRequestsFilter(request, item.id)).length})
            </HomeFilterChip>
          ))}
        </div>
      </RequestsToolbar>

      {list.length === 0 ? (
        <Card size="sm" className={cn("items-center gap-3 px-6 py-12 text-center", CARD_RING)}>
          <p className="text-sm text-muted-foreground">
            {query.trim() ? "Ничего не нашлось." : "Здесь пока пусто."}
          </p>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={REQUESTS_BASE_HREF} />}>
            Открыть каталог
          </Button>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
          <Card size="sm" className={cn("gap-0 p-1", CARD_RING)}>
            <ul aria-label="Мои заявки" className="flex flex-col">
              {list.map((request) => {
                const active = request.id === selected?.id;
                const typeName = findRequestType(request.typeId, catalog)?.type.name;
                return (
                  <li key={request.id} className="border-t border-[var(--corportal-border-grey)]/70 first:border-t-0">
                    <Link
                      href={myRequestsHref({ id: request.id, filter })}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60",
                        active && "bg-muted hover:bg-muted",
                      )}
                    >
                      <span className="flex items-baseline gap-3">
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm leading-snug text-foreground",
                            request.unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {request.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground/80">{request.updatedAt}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <RequestStatusDot status={request.status} />
                        <span className="truncate">
                          {REQUEST_STATUS_SHORT_LABELS[request.status]} · {request.number}
                          {typeName ? ` · ${typeName}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {selected ? <RequestDetail key={selected.id} request={selected} /> : null}
        </div>
      )}
    </RequestsPageShell>
  );
};
