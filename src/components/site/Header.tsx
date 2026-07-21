"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Journal" },
];

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid && "border-b border-ink-600 bg-ink-900/80 backdrop-blur-xl"
      )}
    >
      <div className="shell flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="Nex Desk home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-bone-200 transition-colors hover:text-bone-50"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/portal" className="mono-tag hidden hover:text-bone-50 sm:block">
            client login
          </Link>
          <Link href="/contact" className="btn btn-primary hidden h-10 md:inline-flex">
            Start a project
          </Link>
          <button
            className="btn h-10 px-4 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 top-[72px] z-40 bg-ink-950 px-[var(--gutter)] pt-10 md:hidden">
          <nav className="flex flex-col gap-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink-600 py-5 text-3xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/contact" onClick={() => setOpen(false)} className="btn btn-primary mt-8 w-full justify-center">
            Start a project
          </Link>
        </div>
      )}
    </header>
  );
}
