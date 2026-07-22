import Link from "next/link";
import { Mail, MessageCircle, Clock, Circle } from "lucide-react";

/**
 * The closing call to action, now a two-column block. Left keeps the pitch and
 * buttons; the right — which used to be dead space — carries a live-feeling
 * availability card: current month, open slots, response time and direct
 * contact. It adds a little honest urgency and stops the section looking empty.
 */
export default function CTA() {
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <section className="shell pt-14 pb-6">
      <div className="card grid gap-10 overflow-hidden p-10 sm:p-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        {/* left — pitch */}
        <div>
          <p className="drawer-label">Next step</p>
          <h2 className="mt-6 text-[var(--text-h2)]">
            Tell us what you&apos;re building. We&apos;ll tell you what it takes.
          </h2>
          <p className="mt-5 max-w-md text-bone-400">
            No sales sequence, no discovery-call funnel. One message, one honest reply,
            and a written quote if it&apos;s a fit.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-primary">Start a project</Link>
            <Link href="/pricing" className="btn">See pricing</Link>
          </div>
        </div>

        {/* right — availability card */}
        <div className="rounded-2xl border border-ink-600 bg-ink-950 p-7">
          <div className="flex items-center justify-between">
            <span className="mono-tag">Availability</span>
            <span className="flex items-center gap-2 text-xs text-lime-400">
              <Circle size={8} className="animate-pulse fill-current" />
              taking work
            </span>
          </div>

          <p className="mt-5 text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Booking for {month}
          </p>
          <p className="mt-1 text-sm text-bone-400">A couple of project slots open this month.</p>

          <div className="mt-6 space-y-3 border-t border-ink-600 pt-6">
            <Row icon={Clock} label="Reply time" value="Under 1 working day" />
            <a href="mailto:hello@nexdesk.com" className="block hover:text-lime-400">
              <Row icon={Mail} label="Email" value="hello@nexdesk.com" />
            </a>
            <a href="https://wa.me/920000000000" target="_blank" rel="noreferrer" className="block hover:text-lime-400">
              <Row icon={MessageCircle} label="WhatsApp" value="Message us directly" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-lime-400" />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <span className="mono-tag">{label}</span>
        <span className="truncate text-sm">{value}</span>
      </div>
    </div>
  );
}
