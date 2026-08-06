import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/site/Reveal";
import FeatureList from "@/components/site/FeatureList";
import { TIERS, teaserFeatures } from "@/config/pricing";
import { money } from "@/lib/utils";

/**
 * What it costs, on the homepage.
 *
 * The site had twelve sections and none of them mentioned money — a visitor had
 * to find /pricing on their own to learn whether this was a $2,000 or a $20,000
 * studio. That is an odd omission here in particular: the whole argument of the
 * page above is that everything gets written down and nothing is a surprise.
 *
 * Deliberately a teaser. Four lines per tier rather than the full seven, so
 * there is still a reason to open /pricing.
 */
export default function Pricing({
  services,
}: {
  /** Already fetched by the homepage for ServicesScroll — no extra query. */
  services?: Array<{ starting_at?: number | null; currency?: string | null }>;
}) {
  // The real floor, from whatever is actually in the catalogue. A hardcoded
  // "from $500" would be wrong the first time a price changed.
  const priced = (services ?? [])
    .map((s) => Number(s.starting_at))
    .filter((n) => Number.isFinite(n) && n > 0);
  const floor = priced.length ? Math.min(...priced) : null;
  const floorCurrency = services?.find((s) => Number(s.starting_at) === floor)?.currency ?? "USD";

  return (
    <section className="shell py-24 sm:py-32">
      <div className="max-w-2xl">
        <p className="drawer-label">What it costs</p>
        <h2 className="mt-6 text-[var(--text-h2)] leading-[1.05]">
          A number before you commit,
          <br />
          not after.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-bone-300">
          Most work falls into one of three bands. You get a fixed written quote before
          anything starts — these are the ranges those quotes usually land in.
        </p>
      </div>

      <Reveal
        className="mt-14 grid gap-5 lg:grid-cols-3"
        direction="up"
        stagger={0.12}
      >
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`card relative flex flex-col p-7 sm:p-8 ${
              t.popular ? "border-lime-400/50" : ""
            }`}
          >
            {t.popular && (
              <span className="mono-tag absolute -top-3 left-7 rounded-full bg-lime-400 px-3 py-1 font-semibold text-lime-950">
                most chosen
              </span>
            )}

            <h3 className="text-xl">{t.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-bone-400">{t.tagline}</p>

            <div className="mt-6 border-y border-ink-600 py-5">
              <p
                className="text-2xl tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t.price}
              </p>
              <p className="mono-tag mt-2">typically {t.timeline}</p>
            </div>

            <FeatureList features={teaserFeatures(t)} className="mt-6 flex-1" />

            <Link
              href="/pricing"
              className={`mt-8 justify-center ${t.popular ? "btn btn-primary" : "btn"}`}
            >
              See what&apos;s included
            </Link>
          </div>
        ))}
      </Reveal>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink-600 pt-6">
        <p className="text-sm text-bone-300">
          {floor
            ? <>Need one thing rather than a whole build? Individual services start at{" "}
                <strong className="font-semibold text-bone-50">
                  {money(floor, floorCurrency)}
                </strong>.</>
            : <>Need one thing rather than a whole build? We price individual services too.</>}
        </p>
        <Link
          href="/pricing"
          className="mono-tag inline-flex shrink-0 items-center gap-1.5 text-lime-400 hover:underline"
        >
          Full pricing <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
