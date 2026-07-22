"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  /** Match current path — /services/web-development highlights "Services" */
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

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
        // border always present — toggling color avoids the white-flash repaint
        "fixed inset-x-0 top-0 z-50 border-b",
        open ? "" : "transition-all duration-300",
        open
          ? "border-ink-600 bg-ink-950"
          : solid
          ? "border-ink-600 bg-ink-900/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
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
              className={cn(
                "relative text-sm transition-colors hover:text-bone-50",
                isActive(n.href)
                  ? "text-lime-400"
                  : "text-bone-200"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Book a call — desktop only */}
          <Link
            href="#"
            className="btn h-10 px-4 !hidden md:!inline-flex"
          >
            Book a call
          </Link>
          <Link href="/contact" className="btn btn-primary h-10 !hidden md:!inline-flex">
            Start a project
          </Link>
          {/* Hamburger — mobile only */}
          <button
            className="btn h-10 px-4 !inline-flex md:!hidden"
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
                className={cn(
                  "border-b border-ink-600 py-5 text-3xl tracking-tight",
                  isActive(n.href)
                    ? "border-l-2 border-l-lime-400 pl-4 text-lime-400"
                    : ""
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="btn btn-primary mt-8 w-full justify-center"
          >
            Start a project
          </Link>
          <Link
            href="#"
            onClick={() => setOpen(false)}
            className="btn mt-3 w-full justify-center"
          >
            Book a call
          </Link>
        </div>
      )}
    </header>
  );
}
