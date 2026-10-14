"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEMO_MY_REQUESTS,
  nextRequestNumber,
  type MyRequest,
} from "@/features/tracker/requests/my-requests";
import type { SubmittedFieldValue } from "@/features/tracker/requests/request-forms";

type SubmitRequestInput = {
  typeId: string;
  title: string;
  assignee: string;
  data: SubmittedFieldValue[];
};

type RequestsStore = {
  requests: MyRequest[];
  submitRequest: (input: SubmitRequestInput) => MyRequest;
  addComment: (requestId: string, text: string) => void;
  markRead: (requestId: string) => void;
};

const RequestsStoreContext = createContext<RequestsStore | null>(null);

const nowLabel = () =>
  `Сегодня, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

/** In-memory demo state: submitted requests and comments live until the page reloads. */
export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<MyRequest[]>(DEMO_MY_REQUESTS);

  const submitRequest = useCallback(
    (input: SubmitRequestInput): MyRequest => {
      const value = nextRequestNumber(requests);
      const request: MyRequest = {
        id: String(value),
        number: `ЗВ-${value}`,
        typeId: input.typeId,
        title: input.title,
        status: "new",
        createdAt: "Сегодня",
        dueAt: null,
        assignee: input.assignee,
        updatedAt: "только что",
        unread: false,
        data: input.data,
        events: [{ kind: "system", id: "created", text: `Заявка создана · ${nowLabel()}` }],
      };
      setRequests((prev) => [request, ...prev]);
      return request;
    },
    [requests],
  );

  const addComment = useCallback((requestId: string, text: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              updatedAt: "только что",
              events: [
                ...request.events,
                { kind: "comment", id: `c-${Date.now()}`, author: null, at: nowLabel(), text },
              ],
            }
          : request,
      ),
    );
  }, []);

  const markRead = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.some((request) => request.id === requestId && request.unread)
        ? prev.map((request) => (request.id === requestId ? { ...request, unread: false } : request))
        : prev,
    );
  }, []);

  const value = useMemo(
    () => ({ requests, submitRequest, addComment, markRead }),
    [requests, submitRequest, addComment, markRead],
  );

  return <RequestsStoreContext.Provider value={value}>{children}</RequestsStoreContext.Provider>;
};

export const useRequestsStore = (): RequestsStore => {
  const store = useContext(RequestsStoreContext);
  if (!store) throw new Error("useRequestsStore must be used inside RequestsProvider");
  return store;
};
