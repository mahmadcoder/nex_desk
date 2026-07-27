"use client";

import type { ServiceFaq } from "@/types/site";
export type { ServiceFaq };

import { getServiceFallbackFaqs } from "@/config/siteContent";

export default function ServiceFaqAccordion({
  faqs,
  serviceTitle,
}: {
  faqs?: ServiceFaq[];
  serviceTitle: string;
}) {
  const defaultFaqs: ServiceFaq[] = getServiceFallbackFaqs(serviceTitle);

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
