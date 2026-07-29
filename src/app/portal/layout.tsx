import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Client portal", robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-600 bg-ink-900/90 backdrop-blur-md">
        <div className="shell flex h-[68px] items-center justify-between">
          <Link href="/"><Logo /></Link>
          <span className="mono-tag text-lime-400">client portal</span>
        </div>
      </header>
      <main className="shell flex-1 py-8">{children}</main>
    </div>
  );
}
