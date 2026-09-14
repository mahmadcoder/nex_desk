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

  // Automatically close menu upon route navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Handle scroll to switch solid background
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on Escape key press or desktop viewport resize
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Lock scroll when mobile menu is open
  useScrollLock(open);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        open
          ? "border-ink-700 bg-[#08080B]"
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
                isActive(n.href) ? "text-lime-400" : "text-bone-200"
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

          {/* Animated Hamburger / Close Button — mobile only */}
          <button
            type="button"
            className="btn h-10 px-3.5 gap-2.5 !inline-flex md:!hidden select-none border-ink-600 bg-ink-900/80 hover:bg-ink-800 text-bone-100 active:scale-95 transition-transform"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            <span className="relative flex h-4 w-4.5 flex-col justify-center items-center" aria-hidden>
              <span
                className={cn(
                  "block h-[2px] w-4.5 rounded-full bg-current transition-all duration-300 ease-out",
                  open ? "translate-y-[4px] rotate-45" : "-translate-y-[3px]"
                )}
              />
              <span
                className={cn(
                  "block h-[2px] w-4.5 rounded-full bg-current transition-all duration-300 ease-out",
                  open ? "-translate-y-[4px] -rotate-45" : "translate-y-[3px]"
                )}
              />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider min-w-[36px] text-left">
              {open ? "Close" : "Menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Animated Mobile Menu Overlay Drawer */}
      <div
        data-lenis-prevent
        style={{
          backgroundColor: "#08080B",
          transition:
            "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1), visibility 320ms",
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 top-[72px] z-50 flex flex-col justify-between overflow-y-auto bg-ink-950 px-[var(--gutter)] pb-10 pt-4 md:hidden border-t border-ink-800/60",
          open
            ? "pointer-events-auto opacity-100 translate-y-0 visible"
            : "pointer-events-none opacity-0 -translate-y-4 invisible"
        )}
        aria-hidden={!open}
      >
        <nav className="flex flex-col divide-y divide-ink-800/60">
          {NAV.map((n, idx) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                transition:
                  "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms ease, border-color 200ms ease",
                transitionDelay: open ? `${50 + idx * 40}ms` : "0ms",
              }}
              className={cn(
                "group flex items-center justify-between py-4 text-2xl sm:text-3xl font-medium tracking-tight text-bone-100 transition-all",
                open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
                isActive(n.href)
                  ? "border-l-4 border-l-lime-400 pl-4 text-lime-400 font-semibold"
                  : "hover:text-lime-400"
              )}
            >
              <span>{n.label}</span>
              <span
                className={cn(
                  "text-xs font-mono transition-transform duration-200 group-hover:translate-x-1",
                  isActive(n.href) ? "text-lime-400" : "text-bone-500 group-hover:text-lime-400"
                )}
              >
                0{idx + 1} →
              </span>
            </Link>
          ))}
        </nav>

        <div
          style={{
            transition:
              "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: open ? `${50 + NAV.length * 40}ms` : "0ms",
          }}
          className={cn(
            "mt-8 flex flex-col gap-3 pt-6 border-t border-ink-800/80 transition-all",
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="btn btn-primary h-12 w-full justify-center text-sm font-semibold shadow-lg shadow-lime-400/10"
          >
            Start a project
          </Link>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="btn h-12 w-full justify-center text-sm border-ink-600 bg-ink-900/80 hover:bg-ink-800"
          >
            Book a call
          </Link>
          <div className="mt-2 flex items-center justify-between text-[11px] text-bone-400">
            <span>© Nex Desk Agency</span>
            <span className="text-lime-400 font-mono">Available worldwide</span>
          </div>
        </div>
      </div>
    </header>
  );
}
