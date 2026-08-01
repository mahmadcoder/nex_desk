import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { aiComplete } from "@/lib/ai";
import { AI_PROMPTS, type AIFieldId, type AIMode } from "@/config/aiPrompts";

export const maxDuration = 30;

/**
 * The one AI endpoint the admin panel talks to.
 *
 * SETUP (free, no card):
 *   1. aistudio.google.com/apikey → Create API key
 *   2. .env.local:               GEMINI_API_KEY=...
 *   3. Vercel → Env Variables →  GEMINI_API_KEY, then redeploy
 *   (Alternative: AI_PROVIDER=groq + GROQ_API_KEY from console.groq.com)
 *
 * The key never reaches the browser; every request is auth-guarded here. Staff
 * may use it too — their daily work logs are read by clients and benefit most.
 */

/**
 * Per-user sliding window. In-memory is fine: it resets on cold start, but the
 * provider's own per-minute quota is the real ceiling — this just stops one
 * stuck button from eating the whole day's free allowance.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const mine = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (mine.length >= MAX_PER_WINDOW) {
    hits.set(userId, mine);
    return true;
  }
  mine.push(now);
  hits.set(userId, mine);
  return false;
}

/** Models love to wrap answers in quotes or fences despite instructions. */
function clean(text: string): string {
  let t = text.trim();
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }
  return t.trim();
}

export async function POST(req: Request) {
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (rateLimited(me.userId)) {
    return NextResponse.json(
      { error: "Slow down a little — try again in a minute." },
      { status: 429 }
    );
  }

  let body: { field?: string; mode?: string; text?: string; context?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const builder = AI_PROMPTS[body.field as AIFieldId];
  if (!builder) {
    return NextResponse.json({ error: `Unknown field "${body.field}".` }, { status: 400 });
  }

  const mode: AIMode = body.mode === "suggest" ? "suggest" : "improve";
  const text = String(body.text ?? "").slice(0, 4000);

  if (mode === "improve" && !text.trim()) {
    return NextResponse.json(
      { error: "Write something first, or use Suggest to draft from scratch." },
      { status: 400 }
    );
  }

  // Context values are clamped too — they end up inside the prompt.
  const context: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.context ?? {})) {
    if (typeof v === "string" && v.trim()) context[k.slice(0, 60)] = v.slice(0, 500);
  }

  const result = await aiComplete(builder({ text, context, mode }));

  if (!result.ok) {
    // The helper's errors are written for humans — pass them straight through.
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, suggestion: clean(result.text) });
}
