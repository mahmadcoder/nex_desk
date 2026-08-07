import { createPublicClient } from "@/lib/supabase/public";
import { demoServices } from "@/lib/agencyData";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import DeskGrid from "@/components/site/DeskGrid";
import SmoothScroll from "@/components/site/SmoothScroll";
import CookieBanner from "@/components/site/CookieBanner";
import ExitNudge, { type PopupService } from "@/components/site/ExitNudge";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";

// The exit popup speaks to whichever service the visitor was reading, so the
// catalogue is loaded once here rather than per page. Same fallback to
// `demoServices` every other surface uses, so an empty database still works.
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("services")
    .select("slug, title, short_desc, starting_at, currency, duration_note, is_featured")
    .eq("is_active", true)
    .order("sort_order");

  const services: PopupService[] =
    data && data.length ? data : (demoServices.filter((s) => s.is_active !== false) as PopupService[]);

  return (
    <>
      <SmoothScroll />
      <DeskGrid />
      <Header />
      <main className="relative z-10 pt-[72px]">{children}</main>
      <Footer />
      <CookieBanner />
      <ExitNudge services={services} />
      {/* Marketing site only — the portal has its own WhatsApp route. */}
      <WhatsAppFloat />
    </>
  );
}
