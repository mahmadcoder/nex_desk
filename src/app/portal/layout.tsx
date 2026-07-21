import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Client portal", robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-900">
      <header className="border-b border-ink-600">
        <div className="shell flex h-[68px] items-center justify-between">
          <Link href="/"><Logo /></Link>
          <span className="mono-tag">client portal</span>
        </div>
      </header>
      <main className="shell py-12">{children}</main>
    </div>
  );
}
