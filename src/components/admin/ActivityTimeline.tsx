import { History } from "lucide-react";
import type { ActivityEntry } from "@/lib/insights";

/**
 * What has actually happened on this account.
 *
 * `audit_log` has recorded every privileged action since Phase 5 and nothing
 * has ever read it back — so "when did we send that invoice", "who reset their
 * password" and "did the client accept" were all unanswerable despite the data
 * sitting there the whole time.
 */
export default function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    /* Collapsed by default. This is the longest thing on the page and grows
       forever — every invoice, payment and password reset for the life of the
       account — so left open it buries everything below it. <details> rather
       than client state: no bundle, and it survives a page with JS still
       loading. */
    <details className="card group border-ink-600 p-5">
      <summary className="mb-0 flex cursor-pointer items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50 marker:content-none group-open:mb-4 [&::-webkit-details-marker]:hidden">
        <History size={16} className="text-lime-400" /> Account history
        {!!entries.length && <span className="mono-tag text-[11px]">{entries.length}</span>}
        <span className="mono-tag ml-auto shrink-0 text-bone-300 group-open:hidden">+</span>
        <span className="mono-tag ml-auto hidden shrink-0 text-bone-300 group-open:inline">−</span>
      </summary>

      {entries.length === 0 ? (
        <p className="text-xs leading-relaxed text-bone-300">
          Nothing recorded yet. Every privileged action — invoices issued, payments taken,
          credentials sent, handovers — lands here automatically from now on.
        </p>
      ) : (
        <ol className="space-y-0">
          {entries.map((e, i) => (
            <li key={e.id} className="relative flex gap-3.5 pb-4 last:pb-0">
              {i < entries.length - 1 && (
                <span className="absolute top-4 bottom-0 left-[4px] w-px bg-ink-600" aria-hidden />
              )}
              <span
                className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-bone-100">{e.label}</p>
                <p className="mono-tag mt-0.5 text-[11px]">
                  {new Date(e.at).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                  {e.actor ? ` · ${e.actor}` : ""}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
