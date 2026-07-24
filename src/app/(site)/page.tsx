import { createPublicClient } from "@/lib/supabase/public";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";

import ServicesScroll from "@/components/site/ServicesScroll";
import WorkShowcase from "@/components/site/WorkShowcase";
import Difference from "@/components/site/Difference";
import Process from "@/components/site/Process";
import TestimonialWall from "@/components/site/TestimonialWall";
import CTA from "@/components/site/CTA";
import Studio from "@/components/site/Studio";
import FaqPreview from "@/components/site/FaqPreview";

export const revalidate = 300;

/** Fallback testimonials so the wall looks full before you've added your own. */
const SAMPLE_QUOTES = [
  { client_name: "Ayesha Khan", role: "Founder", company: "Lumen Studio", rating: 5,
    quote: "They shipped in four weeks what two previous agencies couldn't in six months. The staging link from day one meant no surprises." },
  { client_name: "Daniel Reeve", role: "CEO", company: "Northwind", rating: 5,
    quote: "The written scope saved us. Everyone knew exactly what was being built and what it cost. No arguments at the end." },
  { client_name: "Priya Nair", role: "Head of Growth", company: "Vertex", rating: 5,
    quote: "Our organic traffic tripled in three months. They actually explained what they were doing instead of hiding behind jargon." },
  { client_name: "Marco Bianchi", role: "Owner", company: "Práctica", rating: 5,
    quote: "The receipt and agreement PDFs made us look far bigger than we are. Clients take us seriously now." },
  { client_name: "Sana Malik", role: "Director", company: "Kavi", rating: 5,
    quote: "Weekly progress emails I never had to ask for. I always knew where the project stood." },
  { client_name: "Tom Alvarez", role: "Co-founder", company: "Orbit", rating: 5,
    quote: "We own everything — code, files, accounts. No lock-in, no hostage situation. Rare in this business." },
  { client_name: "Hina Farooq", role: "Marketing Lead", company: "Fathom", rating: 5,
    quote: "The ad campaigns hit the cost-per-lead target they promised in the first month. Straight talk, real numbers." },
];

export default async function Home() {
  const supabase = createPublicClient();

  const [{ data: services }, { data: cases }, { data: quotes }] = await Promise.all([
    supabase.from("services").select("slug,title,category,short_desc,starting_at")
      .eq("is_active", true).order("sort_order"),
    supabase.from("case_studies").select("slug,title,client_name,industry,cover_url,outcome,metrics")
      .eq("is_published", true).order("sort_order").limit(3),
    supabase.from("testimonials").select("client_name,role,company,quote,rating")
      .eq("is_published", true).order("sort_order").limit(9),
  ]);

  const wallQuotes = quotes?.length ? quotes : SAMPLE_QUOTES;

  return (
    <>
      <Hero />
      <Marquee />
      <Studio />
      <WorkShowcase cases={cases ?? []} />
      <ServicesScroll services={services ?? []} />
      <Difference />
      <Process />
      <TestimonialWall quotes={wallQuotes} />
      <FaqPreview />
      <CTA />
    </>
  );
}
