import { getAgency } from "@/lib/agency";
import { getSiteBaseUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Structured data for the marketing site.
 *
 * There was none anywhere in the repo — on an agency that sells "Technical SEO
 * & Search Performance" and "SEO engineering for SaaS". Google had no machine
 * -readable statement of who we are, what we sell or what it costs.
 *
 * Plain objects, no dependency. Every price comes from the same `starting_at`
 * the page renders, so the markup cannot quietly contradict the visible number
 * — the discipline `tierFrom()` introduced for the pricing tiers.
 */

const abs = (path: string) => new URL(path, getSiteBaseUrl()).toString();

/** Drops null/undefined/"" so no empty keys reach the output. */
const clean = <T extends Record<string, any>>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")
  ) as T;

/**
 * Who we are. Reads Settings via the already-cached `getAgency()`, so editing
 * the company details in the admin updates the markup with no code change.
 */
export async function organizationLd() {
  const a = await getAgency();

  return clean({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": abs("/#organization"),
    name: a.name,
    description: a.tagline,
    url: a.website || getSiteBaseUrl(),
    logo: a.logoUrl || abs("/favicon.svg"),
    image: abs("/opengraph-image"),
    email: a.email,
    telephone: a.phone,
    address: clean({
      "@type": "PostalAddress",
      addressLocality: "Multan",
      addressCountry: "PK",
      streetAddress: a.location,
    }),
    contactPoint: clean({
      "@type": "ContactPoint",
      contactType: "sales",
      email: a.email,
      telephone: a.whatsapp || a.phone,
      areaServed: "Worldwide",
      availableLanguage: ["English", "Urdu"],
    }),
  });
}

export function serviceLd(s: {
  slug: string;
  title: string;
  short_desc?: string | null;
  category?: string | null;
  starting_at?: number | null;
  currency?: string | null;
}) {
  const price = Number(s.starting_at);
  const hasPrice = Number.isFinite(price) && price > 0;

  return clean({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title,
    description: s.short_desc,
    serviceType: s.category,
    url: abs(`/services/${s.slug}`),
    provider: { "@id": abs("/#organization") },
    areaServed: "Worldwide",
    // `lowPrice` with no `highPrice` is the correct way to say "from $X" —
    // quoting a single `price` we do not actually honour would be a lie Google
    // is entitled to penalise.
    offers: hasPrice
      ? {
          "@type": "AggregateOffer",
          priceCurrency: s.currency ?? "USD",
          lowPrice: price,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  });
}

export function faqLd(faqs: Array<{ question: string; answer: string }>) {
  const usable = faqs.filter((f) => f?.question?.trim() && f?.answer?.trim());
  // An empty FAQPage is a validation error, so say nothing instead.
  if (!usable.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: usable.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function articleLd(p: {
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_url?: string | null;
  published_at?: string | null;
  created_at?: string | null;
}) {
  // `posts` stores author_id, not a name, and has no updated_at — so the
  // organisation is the author and published_at is the only honest date.
  return clean({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt,
    image: p.cover_url || abs(`/blog/${p.slug}/opengraph-image`),
    url: abs(`/blog/${p.slug}`),
    datePublished: p.published_at || p.created_at,
    author: { "@id": abs("/#organization") },
    publisher: { "@id": abs("/#organization") },
  });
}

export function breadcrumbLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(t.path),
    })),
  };
}
