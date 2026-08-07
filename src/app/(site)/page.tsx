import { createPublicClient } from "@/lib/supabase/public";
import { demoServices, demoQuotes } from "@/lib/agencyData";

import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import Studio from "@/components/site/Studio";
import WorkShowcase from "@/components/site/WorkShowcase";
import ServicesScroll from "@/components/site/ServicesScroll";
import Pricing from "@/components/site/Pricing";
import Difference from "@/components/site/Difference";
import Process from "@/components/site/Process";
import TestimonialWall from "@/components/site/TestimonialWall";
import BuildTicker from "@/components/site/BuildTicker";
import TheDesk from "@/components/site/TheDesk";
import FaqPreview from "@/components/site/FaqPreview";
import CTA from "@/components/site/CTA";

export const revalidate = 300;

export default async function Home() {
  const supabase = createPublicClient();

  const [{ data: dbServices }, { data: cases }, { data: quotes }] = await Promise.all([
    // `currency` is read by Pricing.tsx for the catalogue floor line; without
    // it that lookup silently fell through to "USD".
    supabase.from("services").select("slug,title,category,short_desc,starting_at,currency")
      .eq("is_active", true).order("sort_order"),
    supabase.from("case_studies").select("slug,title,client_name,industry,cover_url,outcome,metrics")
      .eq("is_published", true).order("sort_order").limit(3),
    supabase.from("testimonials").select("client_name,role,company,quote,rating")
      .eq("is_published", true).order("sort_order").limit(9),
  ]);

  const services = (dbServices && dbServices.length > 0)
    ? dbServices
    : (demoServices.filter((s) => s.is_active !== false) as any[]);
  const wallQuotes = quotes?.length ? quotes : demoQuotes;

  return (
    <>
      <Hero />
      <Marquee />
      <BuildTicker />
      <Studio />
      <WorkShowcase cases={cases ?? []} />
      <ServicesScroll services={services} />
      {/* What we do, then what it costs, then why us — the money question
          answered where it forms, not after two more sections of persuasion. */}
      <Pricing services={services} />
      <Difference />
      {/* The documents above, then what they actually promise. */}
      <Process />
      <TestimonialWall quotes={wallQuotes} />
      <TheDesk />
      <FaqPreview />
      <CTA />
    </>
  );
}
