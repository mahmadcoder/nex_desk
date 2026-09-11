"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
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

  // Was body-only, with no cleanup on unmount, and Lenis ignored it entirely
  // — the same bug the exit popup had. The hook pauses Lenis and locks the
  // real scroll container.
  useScrollLock(open);

  return (
    <header
      style={open ? { backgroundColor: "#08080B" } : undefined}
      className={cn(
        // border always present — toggling color avoids the white-flash repaint
        "fixed inset-x-0 top-0 z-50 border-b",
        open ? "" : "transition-all duration-300",
        open
          ? "border-ink-600 bg-ink-950"
          : solid
          ? "border-ink-600/60 bg-ink-900/75 backdrop-blur-xl saturate-[1.2]"
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
            href="/contact"
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
        <div
          data-lenis-prevent
          style={{ backgroundColor: "#08080B" }}
          className="fixed inset-x-0 bottom-0 top-[72px] z-50 overflow-y-auto bg-ink-950 px-[var(--gutter)] pb-12 pt-6 md:hidden"
        >
          <nav className="flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "border-b border-ink-600/70 py-4 text-3xl font-medium tracking-tight text-bone-100 transition-colors hover:text-lime-400",
                  isActive(n.href)
                    ? "border-l-4 border-l-lime-400 pl-4 text-lime-400 font-semibold"
                    : ""
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="btn btn-primary h-12 w-full justify-center text-sm font-semibold"
            >
              Start a project
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="btn h-12 w-full justify-center text-sm"
            >
              Book a call
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
