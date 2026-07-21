import Link from "next/link";

export default function CTA() {
  return (
    <section className="shell py-16">
      <div className="card overflow-hidden p-8 sm:p-12">
        <p className="drawer-label">Next step</p>
        <h2 className="mt-4 max-w-3xl text-[var(--text-h2)]">
          Tell us what you&apos;re building. We&apos;ll tell you what it takes.
        </h2>
        <p className="mt-4 max-w-lg text-bone-400">
          No sales sequence, no discovery-call funnel. One message, one honest reply,
          and a written quote if it&apos;s a fit.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="btn btn-primary">Start a project</Link>
          <Link href="/pricing" className="btn">See pricing</Link>
        </div>
      </div>
    </section>
  );
}
