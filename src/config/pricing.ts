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
  price: string;
  timeline: string;
  features: string[];
  /** The middle band, highlighted on both the pricing page and the homepage. */
  popular: boolean;
};

export const TIERS: Tier[] = [
  {
    name: "Launch",
    tagline: "For a sharp marketing site that converts.",
    price: "$1,500 – $3,000",
    timeline: "2–3 weeks",
    features: [
      "Up to 6 custom-designed pages",
      "Mobile-first, fast (90+ Lighthouse)",
      "CMS so you can edit content yourself",
      "Contact forms & lead capture",
      "Basic SEO setup",
      "2 weeks free support",
    ],
    popular: false,
  },
  {
    name: "Growth",
    tagline: "For a web app, store, or serious build.",
    price: "$4,000 – $8,000",
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
    popular: true,
  },
  {
    name: "Scale",
    tagline: "For custom software and SaaS platforms.",
    price: "$12,000+",
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
    popular: false,
  },
];

/**
 * The first four lines of a tier, for the homepage teaser.
 *
 * A teaser that lists all seven gives no reason to click through to /pricing.
 */
export const teaserFeatures = (t: Tier) => t.features.slice(0, 4);
