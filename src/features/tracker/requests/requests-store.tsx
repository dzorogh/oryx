"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEMO_MY_REQUESTS,
  nextRequestNumber,
  type MyRequest,
} from "@/features/tracker/requests/my-requests";
import {
  getRequestForm,
  type RequestField,
  type SubmittedFieldValue,
} from "@/features/tracker/requests/request-forms";
import {
  REQUEST_CATALOG,
  withCustomTypes,
  type CustomRequestTypePlacement,
  type RequestSection,
  type RequestType,
} from "@/features/tracker/requests/requests-catalog";

type SubmitRequestInput = {
  typeId: string;
  title: string;
  assignee: string;
  data: SubmittedFieldValue[];
};

type PublishRequestTypeInput = {
  sectionId: string;
  subsectionId: string;
  name: string;
  description: string;
  fields: RequestField[];
};

type CustomRequestType = CustomRequestTypePlacement & { fields: RequestField[] };

type RequestsStore = {
  requests: MyRequest[];
  /** Static catalog plus types published from the form builder. */
  catalog: RequestSection[];
  getForm: (typeId: string) => RequestField[];
  submitRequest: (input: SubmitRequestInput) => MyRequest;
  publishRequestType: (input: PublishRequestTypeInput) => RequestType;
  addComment: (requestId: string, text: string) => void;
  markRead: (requestId: string) => void;
};

const RequestsStoreContext = createContext<RequestsStore | null>(null);

const nowLabel = () =>
  `Сегодня, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

/** In-memory demo state: submitted requests, comments and builder-made types live until the page reloads. */
export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  const [requests, setRequests] = useState<MyRequest[]>(DEMO_MY_REQUESTS);
  const [customTypes, setCustomTypes] = useState<CustomRequestType[]>([]);

  const catalog = useMemo(() => withCustomTypes(REQUEST_CATALOG, customTypes), [customTypes]);

  const getForm = useCallback(
    (typeId: string) => customTypes.find((item) => item.type.id === typeId)?.fields ?? getRequestForm(typeId),
    [customTypes],
  );

  const publishRequestType = useCallback(
    (input: PublishRequestTypeInput): RequestType => {
      const type: RequestType = {
        id: `custom-${customTypes.length + 1}`,
        name: input.name.trim(),
        description: input.description.trim(),
        custom: true,
      };
      setCustomTypes((prev) => [
        ...prev,
        { sectionId: input.sectionId, subsectionId: input.subsectionId, type, fields: input.fields },
      ]);
      return type;
    },
    [customTypes.length],
  );

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
    () => ({ requests, catalog, getForm, submitRequest, publishRequestType, addComment, markRead }),
    [requests, catalog, getForm, submitRequest, publishRequestType, addComment, markRead],
  );

  return <RequestsStoreContext.Provider value={value}>{children}</RequestsStoreContext.Provider>;
};

export const useRequestsStore = (): RequestsStore => {
  const store = useContext(RequestsStoreContext);
  if (!store) throw new Error("useRequestsStore must be used inside RequestsProvider");
  return store;
};
