import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import DeskGrid from "@/components/site/DeskGrid";
import SmoothScroll from "@/components/site/SmoothScroll";
import Preloader from "@/components/site/Preloader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Preloader />
      <SmoothScroll />
      <DeskGrid />
      <Header />
      <main className="relative z-10 pt-[72px]">{children}</main>
      <Footer />
    </>
  );
}
