/*
 * SERVER ONLY — import this from route handlers and server actions only.
 * It reads API keys from the environment; the browser must never see it.
 * (Client components talk to /api/ai/assist instead.)
 */

/**
 * One completion call, whatever the provider.
 *
 * The panel's AI assist is a thin feature over a single primitive: send a
 * prompt, get text back. Everything provider-specific lives here so the rest
 * of the app never knows which model answered — switching provider is an env
 * var, not a refactor.
 *
 * Providers (both genuinely free):
 *   gemini — default. Free key at aistudio.google.com/apikey, no card,
 *            ~1,500 requests/day on the Flash models.
 *   groq   — fallback. Free key at console.groq.com, Llama 3.3 70B.
 *
 * Errors are RETURNED, never thrown: Next.js strips thrown messages from
 * Server Actions and route handlers in production, and "why is the button
 * broken" must always have a readable answer.
 */

export type AIResult = { ok: true; text: string } | { ok: false; error: string };

const TIMEOUT_MS = 15_000;

export async function aiComplete(prompt: string): Promise<AIResult> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  try {
    if (provider === "groq") return await groq(prompt);
    return await gemini(prompt);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "The AI took too long to answer. Try again." };
    }
    console.error("aiComplete failed:", e);
    return { ok: false, error: "The AI service could not be reached. Try again in a moment." };
  }
}

/**
 * Tried in order until one answers. Google retires model versions out from
 * under old code — `gemini-2.0-flash` now refuses NEW keys entirely, which is
 * exactly how this list earned its existence. `gemini-flash-latest` is
 * Google's own moving alias for the current flash model, so it goes first;
 * the pinned names behind it cover keys old enough to predate the alias.
 * `GEMINI_MODEL` in the environment overrides the whole list.
 */
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];

async function gemini(prompt: string): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      error:
        "AI is not configured yet. Get a free key at aistudio.google.com/apikey " +
        "and set GEMINI_API_KEY in the environment — no card needed.",
    };
  }

  const models = process.env.GEMINI_MODEL?.trim()
    ? [process.env.GEMINI_MODEL.trim()]
    : GEMINI_MODELS;

  let lastError = "The AI service returned an error. Try again in a moment.";

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // Newer flash models spend output tokens on internal "thinking"
          // before the visible answer, so the budget is generous — 1024 was
          // getting eaten before the reply finished.
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("");
      if (!text?.trim()) {
        return { ok: false, error: "The AI returned nothing usable. Try again." };
      }
      return { ok: true, text: text.trim() };
    }

    const detail = await res.text().catch(() => "");
    console.error(`Gemini error on ${model}:`, res.status, detail.slice(0, 300));

    if (/API_KEY_INVALID|API key not valid/i.test(detail)) {
      return {
        ok: false,
        error:
          "Google rejected GEMINI_API_KEY as invalid. Create a fresh key at " +
          "aistudio.google.com/apikey and replace it in the environment.",
      };
    }

    // 403/404 here usually means THIS MODEL is retired or gated for this key
    // — the next candidate may well work, so fall through to it.
    if (res.status === 403 || res.status === 404) {
      lastError =
        "None of the configured Gemini models are available to this key. " +
        "Set GEMINI_MODEL in the environment to a model your key lists.";
      continue;
    }

    return {
      ok: false,
      error:
        res.status === 429
          ? "The free AI limit was hit for this minute — wait a moment and try again."
          : "The AI service returned an error. Try again in a moment.",
    };
  }

  return { ok: false, error: lastError };
}

async function groq(prompt: string): Promise<AIResult> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      error:
        "AI_PROVIDER is set to groq but GROQ_API_KEY is missing. " +
        "Free key at console.groq.com.",
    };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Groq error", res.status, detail.slice(0, 300));
    return {
      ok: false,
      error:
        res.status === 429
          ? "The free AI limit was hit for this minute — wait a moment and try again."
          : "The AI service returned an error. Try again in a moment.",
    };
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    return { ok: false, error: "The AI returned nothing usable. Try again." };
  }
  return { ok: true, text: text.trim() };
}
