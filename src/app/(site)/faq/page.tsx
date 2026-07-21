import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";

export const metadata: Metadata = { title: "FAQ" };
export const revalidate = 300;

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: faqs } = await supabase.from("faqs")
    .select("*").eq("is_active", true).order("sort_order");

  return (
    <>
      <section className="shell py-24">
        <p className="drawer-label">FAQ</p>
        <h1 className="mt-8 max-w-2xl text-[var(--text-h1)]">Questions we get asked.</h1>
      </section>

      <section className="shell max-w-3xl pb-24">
        <div className="divide-y divide-ink-600 border-y border-ink-600">
          {(faqs ?? []).map((f) => (
            <details key={f.id} className="group py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg">
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
