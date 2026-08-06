import Link from "next/link";
import { fmtDate } from "@/lib/datetime";

/**
 * The shell both legal pages share.
 *
 * Privacy and Terms were four unstructured paragraphs each — no headings, no
 * date, nothing a client could scan to find the one answer they came for. This
 * gives them numbered sections, a jump list, and a visible last-updated date,
 * so they read as documents rather than as a wall.
 */

export type LegalSection = {
  id: string;
  heading: string;
  body: React.ReactNode;
};

export default function LegalPage({
  eyebrow = "Legal",
  title,
  intro,
  updated,
  sections,
  footer,
}: {
  eyebrow?: string;
  title: string;
  intro: React.ReactNode;
  /** ISO date. Shown so a reader knows whether this is current. */
  updated: string;
  sections: LegalSection[];
  footer?: React.ReactNode;
}) {
  return (
    <section className="shell max-w-3xl py-16 sm:py-20">
      <p className="drawer-label">{eyebrow}</p>
      <h1 className="mt-6 text-[var(--text-h1)] leading-[1.05]">{title}</h1>

      <p className="mono-tag mt-5">Last updated {fmtDate(updated)}</p>

      <div className="mt-8 text-base leading-relaxed text-bone-200">{intro}</div>

      {/* A jump list, because the question someone arrives with is usually one
          specific thing — "do you keep my data", "when do I own the code". */}
      <nav className="card mt-10 p-5 sm:p-6">
        <p className="mono-tag mb-3 text-[11px]">On this page</p>
        <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id} className="flex gap-2.5 text-sm">
              <span className="mono-tag shrink-0 text-bone-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a href={`#${s.id}`} className="text-bone-200 hover:text-lime-400">
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-14 space-y-12">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="flex items-baseline gap-3 text-[var(--text-h3)] leading-snug">
              <span className="mono-tag shrink-0 text-lime-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.heading}
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-bone-300">{s.body}</div>
          </section>
        ))}
      </div>

      {footer && (
        <div className="mt-16 border-t border-ink-600 pt-8 text-sm leading-relaxed text-bone-300">
          {footer}
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/contact" className="btn btn-primary">
          Ask us anything about this
        </Link>
        <Link href="/" className="btn">
          Back to the site
        </Link>
      </div>
    </section>
  );
}
