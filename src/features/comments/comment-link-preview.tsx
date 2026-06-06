"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Film, Play } from "lucide-react";
import type { UnfurlResult } from "@/features/comments/comments-types";

/** First previewable http(s) link in a rendered comment body (skips mailto/anchors). */
export const firstPreviewableLink = (html: string): string | null => {
  const matches = html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi);
  for (const match of matches) {
    return match[1];
  }
  return null;
};

type Provider = {
  name: string;
  icon: "video" | "play";
  thumbnail?: string;
  title: string;
};

const youtubeId = (url: URL): string | null => {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1) || null;
  }
  if (url.hostname.includes("youtube.com")) {
    return url.searchParams.get("v");
  }
  return null;
};

/** Recognize a few media providers we can render without a network round-trip. */
const detectProvider = (raw: string): Provider | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const ytId = youtubeId(url);
  if (ytId) {
    return {
      name: "YouTube",
      icon: "play",
      thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      title: "Watch on YouTube",
    };
  }
  if (url.hostname.includes("loom.com")) {
    return { name: "Loom", icon: "video", title: "Loom recording" };
  }
  if (url.hostname.includes("figma.com")) {
    return { name: "Figma", icon: "video", title: "Figma file" };
  }
  if (url.hostname.includes("vimeo.com")) {
    return { name: "Vimeo", icon: "play", title: "Watch on Vimeo" };
  }
  return null;
};

const hostOf = (raw: string): string => {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
};

type CommentLinkPreviewProps = {
  url: string;
};

/**
 * Compact link preview card. Known media providers (YouTube/Loom/Figma/Vimeo) render
 * instantly from the URL; everything else is unfurled via the server proxy
 * (`/api/comments/unfurl`) which extracts Open Graph tags. Renders nothing on failure.
 */
export const CommentLinkPreview = ({ url }: CommentLinkPreviewProps) => {
  const provider = useMemo(() => detectProvider(url), [url]);
  const [meta, setMeta] = useState<UnfurlResult | null>(null);

  useEffect(() => {
    if (provider) {
      return;
    }
    let active = true;
    fetch(`/api/comments/unfurl?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: UnfurlResult) => {
        if (active && (data.title || data.image)) {
          setMeta(data);
        }
      })
      .catch(() => {
        /* graceful: no preview */
      });
    return () => {
      active = false;
    };
  }, [url, provider]);

  if (provider) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex max-w-md items-center gap-3 overflow-hidden rounded-lg border border-border bg-muted/30 p-2 transition-colors hover:bg-muted/60"
      >
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5">
          {provider.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary provider host, next/image needs static remotePatterns
            <img
              src={provider.thumbnail}
              alt=""
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : provider.icon === "play" ? (
            <Play className="size-6 text-muted-foreground" />
          ) : (
            <Film className="size-6 text-muted-foreground" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <Play className="size-5 fill-background/80 text-background/80" />
          </span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-muted-foreground">{provider.name}</span>
          <span className="truncate text-sm font-medium text-foreground">{provider.title}</span>
          <span className="truncate text-xs text-muted-foreground">{hostOf(url)}</span>
        </span>
      </a>
    );
  }

  if (!meta) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex max-w-md gap-3 overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/60"
    >
      {meta.image ? (
        <span className="relative size-20 shrink-0 overflow-hidden bg-foreground/5">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary OG image host */}
          <img
            src={meta.image}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col justify-center py-2 pr-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="size-3" />
          {meta.siteName ?? hostOf(url)}
        </span>
        {meta.title ? (
          <span className="line-clamp-1 text-sm font-medium text-foreground">{meta.title}</span>
        ) : null}
        {meta.description ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">{meta.description}</span>
        ) : null}
      </span>
    </a>
  );
};
