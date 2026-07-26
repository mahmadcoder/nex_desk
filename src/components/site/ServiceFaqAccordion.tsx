"use client";

export type ServiceFaq = {
  question: string;
  answer: string;
};

export default function ServiceFaqAccordion({
  faqs,
  serviceTitle,
}: {
  faqs?: ServiceFaq[];
  serviceTitle: string;
}) {
  const defaultFaqs: ServiceFaq[] = [
    {
      question: `How long does delivery take for ${serviceTitle}?`,
      answer: `Most ${serviceTitle} projects ship within 2 to 4 weeks depending on scope, features, and integrations. We set clear weekly milestones so you see live progress every step of the way.`,
    },
    {
      question: "Do I get 100% code ownership and asset copyright?",
      answer: "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears.",
    },
    {
      question: "What happens after the project launches?",
      answer: "Every project includes 30 days of complimentary post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, security monitoring, and allocated development hours.",
    },
    {
      question: "Can I upgrade my package or request custom features during development?",
      answer: "Absolutely. We are agile and flexible. You can request scope additions at any time, and we provide transparent written estimates before building extra features.",
    },
  ];

  const activeFaqs = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <div className="space-y-8" id="faqs">
      <div className="text-center max-w-2xl mx-auto">
        <p className="drawer-label justify-center">Questions</p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-bone-400">
          Answers to common questions about our {serviceTitle} process, delivery, ownership, and pricing.
        </p>
      </div>

      <div className="max-w-3xl mx-auto divide-y divide-ink-600 border-y border-ink-600">
        {activeFaqs.map((faq, idx) => (
          <details key={idx} className="group py-5" open={idx === 0}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base sm:text-lg font-medium text-bone-100 hover:text-lime-400 transition-colors">
              {faq.question}
              <span className="mt-0.5 shrink-0 text-lime-400 font-mono text-xl leading-none transition-transform duration-300 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 max-w-2xl text-xs sm:text-sm leading-relaxed text-bone-400">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
