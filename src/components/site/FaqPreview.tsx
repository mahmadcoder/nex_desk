import { createPublicClient } from "@/lib/supabase/public";

export const DEFAULT_FAQS = [
  {
    id: "1",
    question: "How do we start?",
    answer:
      "Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it, we lock the deal and send a signed agreement PDF by email.",
  },
  {
    id: "2",
    question: "What do you need from me to begin?",
    answer:
      "Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one dedicated point of contact on your side who can approve deliverables.",
  },
  {
    id: "3",
    question: "How fast can you complete my project?",
    answer:
      "Most website and branding projects ship within 2 to 4 weeks. Custom web applications and mobile apps take 6 to 12 weeks depending on scope. We lock exact timeline milestones in writing before starting.",
  },
  {
    id: "4",
    question: "How does payment work?",
    answer:
      "Typically 50% advance to start and 50% on delivery. Larger projects can be split across key milestones. Every payment receives an automated invoice and receipt PDF with clear references.",
  },
  {
    id: "5",
    question: "What if I need something outside the agreed scope?",
    answer:
      "We issue a clear change order detailing the additional cost and timeline impact. Nothing is added silently and nothing is billed without your explicit written approval.",
  },
  {
    id: "6",
    question: "How many revisions are included?",
    answer:
      "Revisions are written directly into your agreement — usually two full rounds per deliverable. Extra rounds are billed hourly at a rate agreed upon in advance.",
  },
  {
    id: "7",
    question: "Do I own the code and design files?",
    answer:
      "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears.",
  },
  {
    id: "8",
    question: "What technologies do you use?",
    answer:
      "We build modern, high-performance applications using Next.js, React, React Native, TypeScript, Tailwind CSS, Node.js, and Supabase — guaranteeing 90+ Lighthouse speed scores and clean maintainable code.",
  },
  {
    id: "9",
    question: "Will my website be mobile-friendly and SEO optimized?",
    answer:
      "Absolutely. Every site we build is 100% responsive across desktop, tablet, and mobile devices, and includes complete technical on-page SEO setup, meta tags, and fast page loads.",
  },
  {
    id: "10",
    question: "What happens after launch?",
    answer:
      "You get 30 days of free post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, backups, security monitoring, and allocated development hours.",
  },
  {
    id: "11",
    question: "Can you redesign or maintain an existing project?",
    answer:
      "Yes. We frequently take over existing codebases, perform UI/UX redesigns, optimize site performance, and provide ongoing monthly maintenance and feature updates.",
  },
  {
    id: "12",
    question: "Do you work with international clients outside Pakistan?",
    answer:
      "Yes. We work seamlessly across global timezones (US, Europe, Middle East, Asia) and accept payments in USD, GBP, EUR, AED, and PKR.",
  },
];

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
