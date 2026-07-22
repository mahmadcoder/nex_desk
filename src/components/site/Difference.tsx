import Reveal from "./Reveal";

const ROWS = [
  ["Written scope before any work", true, false],
  ["Fixed price, agreed upfront", true, false],
  ["Staging link from week one", true, false],
  ["Weekly progress you don't chase", true, false],
  ["You own the code and files", true, "sometimes"],
  ["Endless discovery decks", false, true],
  ["Surprise line items at the end", false, true],
] as const;

/** Honest side-by-side. Structure carries the message; no decoration needed. */
export default function Difference() {
  return (
    <section className="shell py-14">
      <div className="max-w-2xl">
        <p className="drawer-label">Why us</p>
        <h2 className="mt-6 text-[var(--text-h2)]">The difference is in the boring parts.</h2>
        <p className="mt-5 text-bone-400">
          Anyone can design a nice homepage. What actually protects your project is how
          the work is run.
        </p>
      </div>

      <Reveal className="mt-14 overflow-hidden rounded-xl border border-ink-600">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-ink-600 bg-ink-800 px-6 py-4">
          <span className="mono-tag">How it&apos;s run</span>
          <span className="mono-tag w-24 text-center text-lime-400">Nex Desk</span>
          <span className="mono-tag w-24 text-center">Typical agency</span>
        </div>
        {ROWS.map(([label, us, them], i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-ink-600 px-6 py-4 last:border-0">
            <span className="text-sm">{label}</span>
            <span className="grid w-24 place-items-center">
              <Mark on={us === true} />
            </span>
            <span className="grid w-24 place-items-center text-xs text-bone-400">
              {them === "sometimes" ? "sometimes" : <Mark on={them === true} muted />}
            </span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function Mark({ on, muted }: { on: boolean; muted?: boolean }) {
  if (on)
    return (
      <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${muted ? "bg-ink-600 text-bone-300" : "bg-lime-400 text-lime-950"}`}>
        ✓
      </span>
    );
  return <span className="grid h-6 w-6 place-items-center rounded-full border border-ink-600 text-xs text-bone-600">—</span>;
}
