import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_FAQS } from "@/config/siteContent";
export { DEFAULT_FAQS };

/**
 * Home-page FAQ section. Displays all questions directly without duplicates,
 * expanding answers inline (native <details>).
 */
export default async function FaqPreview() {
  const supabase = createPublicClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("id,question,answer")
    .eq("is_active", true)
    .order("sort_order");

  const rawFaqs = faqs?.length ? faqs : DEFAULT_FAQS;

  // Deduplicate questions by text
  const seen = new Set<string>();
  const displayFaqs = rawFaqs.filter((f) => {
    const norm = f.question.trim().toLowerCase();
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  if (!displayFaqs.length) return null;

  return (
    <section className="shell py-14">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        {/* left — heading */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="drawer-label">Questions</p>
          <h2 className="mt-6 text-[var(--text-h2)]">
            The things people ask before they start.
          </h2>
          <p className="mt-5 text-bone-400">
            Answers to common questions about process, delivery, ownership, and pricing.
          </p>
        </div>

        {/* right — accordion */}
        <div className="divide-y divide-ink-600 border-y border-ink-600">
          {displayFaqs.map((f) => (
            <details key={f.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium text-bone-100 hover:text-lime-400 transition-colors">
                {f.question}
                <span className="mt-1 shrink-0 text-lime-400 transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl leading-relaxed text-bone-400">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
