/**
 * The three headline packages.
 *
 * Lived inside `(site)/pricing/page.tsx` as a page-local const. The homepage
 * teaser needs the same three, and copying them would repeat a mistake this
 * site already makes: the four headline stats are hardcoded separately in
 * `Hero.tsx`, `Impact.tsx` and `CTA.tsx`, so changing one leaves the other two
 * quietly lying.
 */

export type Tier = {
  name: string;
  tagline: string;
  /**
   * The floor, as a number. Was a hand-written range string
   * (`"$4,000 – $8,000"`), which had two problems: a range is heard as its
   * lowest number, so the ceiling bought nothing; and being a string, it could
   * not be checked against anything. See `tierFrom` below.
   */
  from: number;
  /**
   * Catalogue slugs this tier bundles. Only used to keep `from` honest — see
   * `tierFrom`. Not rendered.
   */
  covers: string[];
  timeline: string;
  features: string[];
  /**
   * What this tier does NOT include, in one line.
   *
   * Fixed-price agreements already carry an "Explicitly not included" section
   * (`config/aiPrompts.ts`) because it is what prevents arguments later. The
   * public page was making the offer with none of that discipline.
   */
  excludes: string;
  /** The middle band, highlighted on both the pricing page and the homepage. */
  popular: boolean;
};

export const TIERS: Tier[] = [
  {
    name: "Launch",
    tagline: "For a sharp marketing site that converts.",
    from: 1500,
    covers: ["custom-web-development", "web-design", "content-copywriting"],
    timeline: "2–3 weeks",
    features: [
      "Up to 6 custom-designed pages",
      "Mobile-first, fast (90+ Lighthouse)",
      "CMS so you can edit content yourself",
      "Contact forms & lead capture",
      "Basic SEO setup",
      // The FAQ already promises "usually two full rounds per deliverable", and
      // Growth said so. Launch did not — leaving the cheapest tier the only one
      // that reads as unlimited, which is exactly where a fixed price drowns.
      "2 revision rounds per milestone",
      "2 weeks free support",
    ],
    excludes: "Custom app logic, user accounts, integrations and content writing are quoted separately.",
    popular: false,
  },
  {
    name: "Growth",
    tagline: "For a web app, store, or serious build.",
    // Was $4,000. The parts it bundles start at roughly $3,200–4,500 together,
    // so the bundle carried no premium at all — selling the pieces separately
    // paid better than selling the package.
    from: 5000,
    covers: ["ecommerce", "api-integrations", "custom-web-development"],
    timeline: "6–8 weeks",
    features: [
      "Everything in Launch",
      "Custom web app or e-commerce",
      "User accounts & dashboards",
      "Third-party & payment integrations",
      "Admin panel to run it yourself",
      "2 revision rounds per milestone",
      "2 weeks free support",
    ],
    excludes: "Multi-tenant SaaS, native mobile apps and ongoing content or ad management are not in this band.",
    popular: true,
  },
  {
    name: "Scale",
    tagline: "For custom software and SaaS platforms.",
    from: 12000,
    covers: ["saas-architecture", "cloud-devops", "security-compliance"],
    timeline: "12+ weeks",
    features: [
      "Everything in Growth",
      "Full custom SaaS / platform",
      "Multi-role access & permissions",
      "Advanced analytics & reporting",
      "Dedicated project lead",
      "CI/CD, monitoring & DevOps",
      // Was "12 months support & retainer options", which reads as twelve
      // months free — and every other surface says two weeks since Phase 27.
      "2 weeks free support, retainer options after",
    ],
    excludes: "Hardware, paid ad spend and third-party licence fees are billed at cost, never marked up.",
    popular: false,
  },
];

/**
 * What a tier actually starts at, floored by the parts it contains.
 *
 * A bundle must never quote below its own components, and until now it did:
 * `/pricing` showed "Scale — $12,000+" and then, four hundred pixels below in
 * the per-service grid, "SaaS & Web Product Engineering — from $3,500" for
 * effectively the same deliverable. Same for Growth ($4,000) against
 * "Custom Web App — from $1,500". A visitor anchors on the smaller number and
 * every conversation starts there.
 *
 * It drifted because `TIERS` is hardcoded here while `starting_at` is DB data
 * edited at `/nx-control/services` — nothing connected them, so every price
 * change in the admin widened the gap silently.
 *
 * Taking the max makes that impossible rather than merely fixed: raise a
 * covered service in the admin and the tier floor rises with it. Same reasoning
 * as the computed catalogue floor in `Pricing.tsx`, which already refuses to
 * hardcode "from $500".
 */
export function tierFrom(
  tier: Tier,
  services?: Array<{ slug?: string | null; starting_at?: number | null }>
): number {
  const covered = (services ?? [])
    .filter((s) => s.slug && tier.covers.includes(s.slug))
    .map((s) => Number(s.starting_at))
    .filter((n) => Number.isFinite(n) && n > 0);

  return Math.max(tier.from, ...covered);
}

/**
 * The first four lines of a tier, for the homepage teaser.
 *
 * A teaser that lists all seven gives no reason to click through to /pricing.
 */
export const teaserFeatures = (t: Tier) => t.features.slice(0, 4);
