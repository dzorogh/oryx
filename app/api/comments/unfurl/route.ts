import { NextResponse } from "next/server";
import type { UnfurlResult } from "@/features/comments/comments-types";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 4000;
const MAX_BYTES = 512 * 1024;

/** Reject non-http(s) and obvious private/loopback hosts (best-effort SSRF guard). */
const isPublicHttpUrl = (raw: string): URL | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return null;
  }
  return url;
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");

const metaContent = (html: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeEntities(match[1].trim());
    }
  }
  return undefined;
};

const parseMeta = (html: string, url: URL): UnfurlResult => {
  const prop = (name: string) =>
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
  const propReversed = (name: string) =>
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      "i",
    );

  const title =
    metaContent(html, [prop("og:title"), propReversed("og:title"), prop("twitter:title")]) ??
    metaContent(html, [/<title[^>]*>([^<]+)<\/title>/i]);
  const description = metaContent(html, [
    prop("og:description"),
    propReversed("og:description"),
    prop("twitter:description"),
    prop("description"),
  ]);
  let image = metaContent(html, [
    prop("og:image"),
    propReversed("og:image"),
    prop("twitter:image"),
  ]);
  const siteName =
    metaContent(html, [prop("og:site_name")]) ?? url.hostname.replace(/^www\./, "");

  // Resolve a relative image URL against the page origin.
  if (image && !/^https?:\/\//i.test(image)) {
    try {
      image = new URL(image, url.origin).href;
    } catch {
      image = undefined;
    }
  }

  return { url: url.href, title, description, image, siteName };
};

export const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const url = isPublicHttpUrl(target);
  if (!url) {
    return NextResponse.json({ error: "Invalid or disallowed url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "OryxBot/1.0 (+link-preview)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      return NextResponse.json({ error: "Not previewable" }, { status: 422 });
    }
    // Read a bounded slice; meta tags live in <head> near the top.
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      for (; ;) {
        const { done, value } = await reader.read();
        if (done || !value) {
          break;
        }
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (received >= MAX_BYTES || /<\/head>/i.test(html)) {
          await reader.cancel().catch(() => { });
          break;
        }
      }
    } else {
      html = await response.text();
    }

    const result = parseMeta(html, url);
    return NextResponse.json(result, {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
};
