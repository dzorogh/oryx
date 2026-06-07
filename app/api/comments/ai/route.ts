import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  CommentAiAction,
  CommentAiRequest,
} from "@/features/comments/comments-types";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_INPUT_CHARS = 8_000;

/** System prompts per action. The user message carries the comment text. */
const SYSTEM_PROMPTS: Record<CommentAiAction, string> = {
  improve:
    "You are an editor. Rewrite the user's comment to be clearer and more professional while preserving meaning and tone. Return only the rewritten text.",
  grammar:
    "Fix spelling, grammar, and punctuation in the user's comment. Do not change meaning or style. Return only the corrected text.",
  shorten:
    "Make the user's comment significantly shorter while keeping the key point. Return only the shortened text.",
  lengthen:
    "Expand the user's comment with helpful, on-topic detail. Return only the expanded text.",
  summarize:
    "Summarize the user's comment in one concise sentence. Return only the summary.",
  tldr:
    "You are summarizing a discussion thread. Produce a short TL;DR with 2-4 bullet points capturing decisions, open questions, and action items. Return plain text bullets starting with '- '.",
  translate:
    "Translate the user's comment into the requested target language. Preserve tone and formatting. Return only the translation.",
  "smart-reply":
    "Suggest a concise, polite reply to the user's comment. Return only the reply text.",
  soften:
    "Rewrite the user's comment to be more polite and constructive, removing hostility while keeping the substance. Return only the rewritten text.",
  toxicity:
    "Classify whether the user's comment is hostile, toxic, or unprofessional. Respond with exactly 'toxic' or 'ok' and nothing else.",
};

const buildUserPrompt = (body: CommentAiRequest): string => {
  if (body.action === "translate") {
    return `Target language: ${body.targetLang ?? "English"}\n\n${body.text}`;
  }
  return body.text;
};

export async function POST(request: Request) {
  // Default to OpenAI so a bare `OPENAI_API_KEY` is enough to enable real AI.
  // `AI_BASE_URL` still allows pointing at any OpenAI-compatible provider.
  const baseURL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured" },
      { status: 503 },
    );
  }

  let body: CommentAiRequest;
  try {
    body = (await request.json()) as CommentAiRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body?.action || !SYSTEM_PROMPTS[body.action] || typeof body.text !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = body.text.slice(0, MAX_INPUT_CHARS);
  const client = new OpenAI({ apiKey, baseURL, timeout: REQUEST_TIMEOUT_MS });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: body.action === "toxicity" ? 0 : 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[body.action] },
        { role: "user", content: buildUserPrompt({ ...body, text }) },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ result, source: "ai" });
  } catch {
    return NextResponse.json({ error: "provider_error" }, { status: 502 });
  }
}
