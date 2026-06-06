import type {
  CommentAiAction,
  CommentAiResult,
} from "@/features/comments/comments-types";

const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

const tidyGrammar = (text: string): string => {
  const fixed = text
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bteh\b/gi, "the")
    .trim();
  return splitSentences(fixed)
    .map((sentence) => {
      const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    })
    .join(" ");
};

const HOSTILE_PATTERNS =
  /\b(stupid|idiot|dumb|useless|trash|garbage|shut up|hate|terrible|awful|incompetent|nonsense|ridiculous)\b/i;

/** Heuristic toxicity flag used by the soften banner (and as the mock for the AI route). */
export const looksHostile = (text: string): boolean => HOSTILE_PATTERNS.test(text);

const softenText = (text: string): string => {
  const cleaned = text
    .replace(HOSTILE_PATTERNS, "not ideal")
    .replace(/!+/g, ".")
    .replace(/\b(you always|you never)\b/gi, "it sometimes feels like");
  return `I want to flag a concern constructively: ${tidyGrammar(cleaned)}`;
};

/** Deterministic offline transforms — stand-in when no AI provider is configured. */
export const mockAiAction = (
  action: CommentAiAction,
  raw: string,
  targetLang?: string,
): string => {
  const text = raw.trim();
  if (!text) {
    return "Thanks for the update — this looks good to me. I'll review the details and follow up shortly.";
  }
  const sentences = splitSentences(tidyGrammar(text));
  switch (action) {
    case "grammar":
      return tidyGrammar(text);
    case "improve":
      return tidyGrammar(text.replace(/\b(really|very|just|basically|actually)\s+/gi, ""));
    case "shorten":
      return sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.5))).join(" ");
    case "lengthen":
      return `${sentences.join(" ")} To add context, this should help align everyone and make the next steps clear.`;
    case "summarize":
      return `In short: ${sentences[0] ?? tidyGrammar(text)}`;
    case "tldr":
      return sentences
        .slice(0, 4)
        .map((sentence) => `- ${sentence}`)
        .join("\n");
    case "translate":
      return `[${targetLang ?? "translation"}] ${text}`;
    case "smart-reply":
      return "Thanks for sharing — that makes sense. I'll take a look and follow up shortly.";
    case "soften":
      return softenText(text);
    case "toxicity":
      return looksHostile(text) ? "toxic" : "ok";
    default:
      return text;
  }
};

/**
 * Run an AI transform: tries the server route (real provider via server-only env),
 * falling back to the deterministic local mock when the provider is not configured
 * or unreachable. Always resolves so the UI never blocks on AI availability.
 */
export const runAiAction = async (
  action: CommentAiAction,
  text: string,
  opts: { targetLang?: string; signal?: AbortSignal } = {},
): Promise<CommentAiResult> => {
  try {
    const response = await fetch("/api/comments/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, text, targetLang: opts.targetLang }),
      signal: opts.signal,
    });
    if (response.ok) {
      const data = (await response.json()) as Partial<CommentAiResult>;
      if (typeof data.result === "string" && data.result.length > 0) {
        return { result: data.result, source: "ai" };
      }
    }
  } catch {
    // Network/abort — fall through to the local mock.
  }
  return { result: mockAiAction(action, text, opts.targetLang), source: "mock" };
};

/** True when the heuristic OR the AI classifier marks the text as hostile. */
export const checkToxicity = async (text: string): Promise<boolean> => {
  if (!text.trim()) {
    return false;
  }
  const { result, source } = await runAiAction("toxicity", text);
  if (source === "ai") {
    return /toxic/i.test(result);
  }
  return looksHostile(text);
};
