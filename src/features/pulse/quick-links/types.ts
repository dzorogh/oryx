export type PulseQuickLink = {
  id: string;
  label: string;
  href: string;
};

export type PulseQuickLinkPatch = Partial<Pick<PulseQuickLink, "label" | "href">>;
