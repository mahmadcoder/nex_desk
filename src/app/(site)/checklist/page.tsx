import Link from "next/link";
import type { Metadata } from "next";
import { Printer } from "lucide-react";
import CTA from "@/components/site/CTA";
import Reveal from "@/components/site/Reveal";
import ChecklistSubscribe from "@/components/site/ChecklistSubscribe";
import { LAUNCH_CHECKLIST, CHECKLIST_COUNT } from "@/config/launchChecklist";

export const metadata: Metadata = {
  title: "The pre-launch checklist",
  description: `${CHECKLIST_COUNT} things worth checking before a website goes live — performance, SEO, security, DNS, and who actually owns the domain. Free, no email required.`,
};

/**
 * The checklist the exit-intent popup has been promising.
 *
 * Ungated on purpose. Its job is to be genuinely useful to someone who will
 * never hire us — that is the only reason a stranger keeps a link.
 */
export default function ChecklistPage() {
  return (
    <>
      <section className="shell max-w-3xl py-16 sm:py-20">
        <p className="drawer-label">Free, no email needed</p>
        <h1 className="mt-6 text-[var(--text-h1)] leading-[1.05]">
          The pre-launch
          <br />
          checklist.
        </h1>

        <p className="mt-6 text-base leading-relaxed text-bone-200">
          {CHECKLIST_COUNT} things worth checking before a website goes live. This is the list
          every project of ours passes, written out in full.
        </p>
        <p className="mt-4 text-base leading-relaxed text-bone-300">
          Use it on us. Use it on whoever built your last site, or whoever builds your next
          one. Nothing here is specific to working with us — the section on{" "}
          <a href="#own" className="text-lime-400 hover:underline">
            who actually owns the domain
          </a>{" "}
          is the one we would most like you to read before you hire anybody.
        </p>

        <div className="no-print mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className="btn btn-primary">
            Have us do it instead
          </Link>
          {/* No JS: the browser's own print dialogue, with a stylesheet behind it. */}
          <a href="#print" className="btn gap-2">
            <Printer size={15} /> Print or save as PDF
          </a>
        </div>

        <nav className="no-print card mt-12 p-5 sm:p-6">
          <p className="mono-tag mb-3 text-[11px]">The ten groups</p>
          <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {LAUNCH_CHECKLIST.map((g, i) => (
              <li key={g.id} className="flex gap-2.5 text-sm">
                <span className="mono-tag shrink-0 text-bone-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <a href={`#${g.id}`} className="text-bone-200 hover:text-lime-400">
                  {g.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      <section id="print" className="shell max-w-3xl pb-16">
        <div className="space-y-14">
          {LAUNCH_CHECKLIST.map((group, i) => (
            <Reveal key={group.id} direction="up" distance={20}>
              <section id={group.id} className="scroll-mt-28 break-inside-avoid">
                <h2 className="flex items-baseline gap-3 text-[var(--text-h3)] leading-snug">
                  <span className="mono-tag shrink-0 text-lime-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {group.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-bone-400">{group.intro}</p>

                <ul className="mt-5 space-y-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 bg-ink-900 p-4">
                      {/* A real box, so the printed page is something you can
                          actually tick with a pen. */}
                      <span
                        aria-hidden
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ink-500 bg-ink-800"
                      />
                      <span className="text-sm leading-relaxed text-bone-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>

        <div className="no-print mt-16 border-t border-ink-600 pt-8">
          <h2 className="text-lg text-bone-50">Want this in your inbox?</h2>
          <p className="mt-2 mb-4 max-w-lg text-sm leading-relaxed text-bone-300">
            Optional — the whole list is on this page and always will be. One short email a
            month, and you can leave from any of them.
          </p>
          <ChecklistSubscribe />
        </div>
      </section>

      <div className="no-print">
        <CTA />
      </div>
    </>
  );
}
