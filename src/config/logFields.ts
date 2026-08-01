/**
 * What a day's work looks like, per kind of service.
 *
 * One form asking "what did you do" flattens an SEO day and an engineering day
 * into the same shapeless paragraph, so nothing can be reported on afterwards.
 * The project's service category picks the extra fields; the answers go into
 * `daily_work_logs.metrics` as JSONB, so adding a category here is a code
 * change with no migration.
 *
 * A service row may override this entirely via `services.log_fields`.
 */

export type LogField = {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "boolean";
  placeholder?: string;
  /** Shown under the input — say what good looks like, not what the field is. */
  hint?: string;
};

export type LogFieldSet = {
  key: string;
  label: string;
  fields: LogField[];
};

/**
 * Categories match `services.category`. Matching is loose and case-insensitive
 * so "Engineering", "Web & Engineering" and "engineering" all resolve here.
 */
export const LOG_FIELD_SETS: LogFieldSet[] = [
  {
    key: "engineering",
    label: "Engineering",
    fields: [
      { id: "features", label: "Features shipped", type: "text", placeholder: "Checkout flow, address validation" },
      { id: "bugs_fixed", label: "Bugs fixed", type: "number", placeholder: "0" },
      { id: "prs", label: "PRs / commits", type: "text", placeholder: "#42, #43" },
      { id: "pushed_staging", label: "Pushed to staging", type: "boolean",
        hint: "Tick only if the client can see it on the staging link right now." },
      { id: "tech_debt", label: "Known debt introduced", type: "text",
        placeholder: "Hardcoded rate limit — needs config", hint: "Write it down now or it disappears." },
    ],
  },
  {
    key: "design",
    label: "Design",
    fields: [
      { id: "screens", label: "Screens / components done", type: "text", placeholder: "Pricing page, nav, footer" },
      { id: "revisions", label: "Revision round", type: "number", placeholder: "1",
        hint: "The agreement includes a set number. Logging it is how you prove you hit the limit." },
      { id: "assets_delivered", label: "Assets handed over", type: "text", placeholder: "Logo pack, 12 icons" },
      { id: "needs_approval", label: "Waiting on client approval", type: "boolean" },
    ],
  },
  {
    key: "growth",
    label: "SEO & growth",
    fields: [
      { id: "keywords", label: "Keywords worked", type: "text", placeholder: "software agency multan, custom crm" },
      { id: "pages_optimised", label: "Pages optimised", type: "number", placeholder: "0" },
      { id: "backlinks", label: "Backlinks built", type: "number", placeholder: "0" },
      { id: "ranking_movement", label: "Ranking movement", type: "text",
        placeholder: "\"custom crm\" 14 → 9", hint: "Position changes are the only proof SEO is working." },
      { id: "technical_fixes", label: "Technical fixes", type: "text", placeholder: "Core Web Vitals, schema markup" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing & ads",
    fields: [
      { id: "campaigns", label: "Campaigns touched", type: "text", placeholder: "Meta retargeting, Google search" },
      { id: "spend", label: "Spend today", type: "number", placeholder: "0" },
      { id: "leads", label: "Leads generated", type: "number", placeholder: "0" },
      { id: "cpl", label: "Cost per lead", type: "text", placeholder: "$4.20",
        hint: "The number the client actually judges the work by." },
      { id: "creatives", label: "Creatives shipped", type: "number", placeholder: "0" },
    ],
  },
  {
    key: "ai",
    label: "AI & automation",
    fields: [
      { id: "workflows", label: "Workflows built", type: "text", placeholder: "Lead routing, invoice OCR" },
      { id: "integrations", label: "Integrations wired", type: "text", placeholder: "HubSpot, Slack" },
      { id: "runs_tested", label: "Test runs", type: "number", placeholder: "0" },
      { id: "accuracy", label: "Accuracy / result", type: "text", placeholder: "92% on 50 sample docs" },
    ],
  },
];

/** The shared fields every log has, whatever the service. */
export const CORE_HINT =
  "What you did, in the client's language. This is what reaches them when you share it.";

const CATEGORY_MATCH: Array<[string, string[]]> = [
  ["engineering", ["engineering", "development", "web", "mobile", "app", "software", "ecommerce", "e-commerce"]],
  ["design", ["design", "brand", "ui", "ux", "creative"]],
  ["growth", ["growth", "seo", "search"]],
  ["marketing", ["marketing", "ads", "advertising", "social", "paid"]],
  ["ai", ["ai", "automation", "data"]],
];

/**
 * Resolves a service category (or slug, or title) to a field set.
 * Returns null when nothing matches — the log form then shows the core fields
 * only, which is the correct behaviour for general agency work.
 */
export function fieldSetFor(...hints: Array<string | null | undefined>): LogFieldSet | null {
  const haystack = hints.filter(Boolean).join(" ").toLowerCase();
  if (!haystack.trim()) return null;

  for (const [key, needles] of CATEGORY_MATCH) {
    if (needles.some((n) => haystack.includes(n))) {
      return LOG_FIELD_SETS.find((s) => s.key === key) ?? null;
    }
  }
  return null;
}

/** Human-readable summary of a metrics blob, for the project page and portal. */
export function describeMetrics(metrics: Record<string, unknown> | null | undefined) {
  if (!metrics) return [];
  const byId = new Map(LOG_FIELD_SETS.flatMap((s) => s.fields).map((f) => [f.id, f]));

  return Object.entries(metrics)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false)
    .map(([id, v]) => ({
      label: byId.get(id)?.label ?? id.replace(/_/g, " "),
      value: typeof v === "boolean" ? "Yes" : String(v),
    }));
}
