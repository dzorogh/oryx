import type { MyRequestsFilter } from "@/features/tracker/requests/my-requests";

export const REQUESTS_BASE_HREF = "/tracker/requests";
export const MY_REQUESTS_HREF = `${REQUESTS_BASE_HREF}/my`;

export const catalogHref = (sectionId?: string, subsectionId?: string): string => {
  const params = new URLSearchParams();
  if (sectionId) params.set("section", sectionId);
  if (subsectionId) params.set("sub", subsectionId);
  const query = params.toString();
  return query ? `${REQUESTS_BASE_HREF}?${query}` : REQUESTS_BASE_HREF;
};

export const requestFormHref = (typeId: string): string => `${REQUESTS_BASE_HREF}/new/${typeId}`;

export const REQUEST_BUILDER_HREF = `${REQUESTS_BASE_HREF}/builder`;

/** Opens the form builder with the section and subsection preselected. */
export const requestBuilderHref = (sectionId?: string, subsectionId?: string): string => {
  const params = new URLSearchParams();
  if (sectionId) params.set("section", sectionId);
  if (subsectionId) params.set("sub", subsectionId);
  const query = params.toString();
  return query ? `${REQUEST_BUILDER_HREF}?${query}` : REQUEST_BUILDER_HREF;
};

export const myRequestsHref = (options: { id?: string; filter?: MyRequestsFilter } = {}): string => {
  const params = new URLSearchParams();
  if (options.filter && options.filter !== "active") params.set("filter", options.filter);
  if (options.id) params.set("id", options.id);
  const query = params.toString();
  return query ? `${MY_REQUESTS_HREF}?${query}` : MY_REQUESTS_HREF;
};
