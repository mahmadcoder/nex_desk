import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";
import { DEFAULT_FAQS } from "@/components/site/FaqPreview";

export const metadata: Metadata = { title: "FAQ — Frequently Asked Questions" };
export const revalidate = 300;

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const rawFaqs = faqs?.length ? faqs : DEFAULT_FAQS;

  const seen = new Set<string>();
  const displayFaqs = rawFaqs.filter((f) => {
    const norm = f.question.trim().toLowerCase();
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  return (
    <>
      <section className="shell py-16">
        <p className="drawer-label">FAQ</p>
        <h1 className="mt-6 max-w-2xl text-[var(--text-h1)]">Questions we get asked.</h1>
      </section>

      <section className="shell max-w-3xl pb-16">
        <div className="divide-y divide-ink-600 border-y border-ink-600">
          {displayFaqs.map((f) => (
            <details key={f.id} className="group py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium text-bone-100 hover:text-lime-400 transition-colors">
                {f.question}
                <span className="mt-1 shrink-0 text-lime-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-2xl leading-relaxed text-bone-400">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
