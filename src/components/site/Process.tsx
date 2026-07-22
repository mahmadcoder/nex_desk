import Reveal from "./Reveal";

/**
 * Numbered because this genuinely is a sequence — each step gates the next,
 * and the client needs to know where they are in it.
 */
const STEPS = [
  ["Talk", "A call to work out what you actually need, which is often not what you first asked for."],
  ["Quote", "A written proposal with scope, price, timeline and what is excluded. No verbal estimates."],
  ["Lock", "You approve, we send a signed agreement PDF and take the advance. Work starts when it clears."],
  ["Build", "Weekly progress emails and a staging link. You can see it as it happens, not at the end."],
  ["Ship", "Launch, handover document, all credentials transferred. You own everything."],
  ["Stay", "One month free support, then an optional retainer for updates and monitoring."],
];

export default function Process() {
  return (
    <section className="shell py-12">
      <p className="drawer-label">How it goes</p>
      <h2 className="mt-6 max-w-2xl text-[var(--text-h2)]">
        Six steps. You always know which one you&apos;re on.
      </h2>

      <Reveal className="mt-10 grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <div key={title} className="bg-ink-900 p-8">
            <span className="mono-tag text-lime-400">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-5 text-2xl">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-bone-400">{body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
