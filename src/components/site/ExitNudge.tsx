"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Clock, Loader2, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { money, whatsappLink } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";

/**
 * Exit-intent nudge — the calm alternative to a timed popup.
 *
 * Fires ONCE per browser session, and only when the cursor leaves the top of
 * the viewport (the "I'm about to close this tab" motion) on desktop, or on a
 * fast upward scroll on mobile. Never nags, never repeats.
 *
 * It speaks to whatever the visitor was actually reading. Earlier versions all
 * assumed a website — a checklist, website price tiers, a site audit — which is
 * useless to the person who already has a site and came looking for a mobile
 * app or an automation. The agency sells sixteen services; the popup reads the
 * path and answers for the one in front of them.
 *
 * No form, no input, no tool. One card.
 */

const KEY = "nd-exit-nudge-shown"; // sessionStorage: only once per visit

export type PopupService = {
  slug: string;
  title: string;
  short_desc?: string | null;
  starting_at?: number | null;
  currency?: string | null;
  duration_note?: string | null;
  is_featured?: boolean | null;
};

export default function ExitNudge({ services = [] }: { services?: PopupService[] }) {
  const [show, setShow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();

  /**
   * Closing on click and letting the Link navigate on its own meant the popup
   * vanished instantly while the server rendered the destination — so you sat
   * looking at the page you were already on for about a second, which reads as
   * a dead link.
   *
   * Inside a transition, React holds BOTH the close and the route change until
   * the new page is ready, so they commit together and there is no flash.
   */
  function go(href: string) {
    startNavigation(() => {
      router.push(href);
      setShow(false);
    });
  }

  /* ---- the trigger. Unchanged: it was always the good part. ----------- */
  useEffect(() => {
    if (window.sessionStorage.getItem(KEY)) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastY = window.scrollY;

    const trigger = () => {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, "1");
      setShow(true);
      cleanup();
    };

    // desktop: cursor leaves through the top of the window
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };
    // mobile: a decisive upward flick near the top (heading for the address bar)
    const onScroll = () => {
      if (!reduce && lastY - window.scrollY > 40 && window.scrollY < 200) trigger();
      lastY = window.scrollY;
    };

    const armTimer = setTimeout(() => {
      document.addEventListener("mouseout", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 8000); // give people at least 8s before arming

    function cleanup() {
      clearTimeout(armTimer);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  // Locks <html>, not <body>. See the hook — body was the wrong element, and
  // on this site Lenis ignored it anyway.
  useScrollLock(show);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  /* ---- what the visitor was reading ----------------------------------- */
  const slug = pathname?.startsWith("/services/") ? pathname.split("/")[2] : null;
  const current = slug ? services.find((s) => s.slug === slug) : undefined;

  const priceOf = (s: PopupService) =>
    s.starting_at ? `from ${money(Number(s.starting_at), s.currency ?? "USD")}` : "priced per project";

  // Generic pages get three real services rather than a question. Featured
  // first, then whatever order the admin set — same as everywhere else.
  const featured = [...services]
    .sort((a, b) => Number(!!b.is_featured) - Number(!!a.is_featured))
    .slice(0, 3);

  const contactHref = current
    ? `/contact?service=${encodeURIComponent(current.slug)}`
    : "/contact";

  const waHref = whatsappLink(
    undefined,
    current
      ? `Hi Nex Desk — I was reading about ${current.title.toLowerCase()} on your site. Can we talk about it?`
      : "Hi Nex Desk — I saw your site and wanted to ask about a project."
  );

  return (
    <div
      /* Also on the BACKDROP, not just the panel. Lenis checks this across the
         whole composed path, and the backdrop is most of the screen on desktop
         — wheeling anywhere outside the card went straight to Lenis. */
      data-lenis-prevent
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setShow(false)}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Before you go"
        onClick={(e) => e.stopPropagation()}
        /* data-lenis-prevent: without it, Lenis grabs the wheel inside this
           panel and scrolls the page behind instead. */
        data-lenis-prevent
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-600 bg-ink-900 p-7 shadow-2xl outline-none sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            <span className="mono-tag">Before you go</span>
          </div>
          <button
            onClick={() => setShow(false)}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-bone-500 transition-colors hover:bg-ink-800 hover:text-bone-200"
          >
            <X size={16} />
          </button>
        </div>

        {current ? (
          /* They were reading one service. Speak to that one and nothing else. */
          <>
            <h3
              className="mt-4 text-2xl leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {current.title}
            </h3>

            {current.short_desc && (
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{current.short_desc}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-lime-400/25 bg-lime-400/[0.06] px-4 py-3.5">
              <p
                className="text-xl tracking-tight text-bone-50"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {priceOf(current)}
              </p>
              {current.duration_note && (
                <p className="mono-tag flex items-center gap-1.5 text-[11px]">
                  <Clock size={12} /> {current.duration_note}
                </p>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-bone-300">
              Tell us what you have in mind and you get a fixed written quote — the scope, the
              price and what is excluded, before anything starts.
            </p>
          </>
        ) : (
          /* No service context. Three real ones with real prices — information,
             not a quiz. Still nothing to fill in. */
          <>
            <h3
              className="mt-4 text-2xl leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What are you building?
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-bone-400">
              Whatever it is, you get a fixed written price before we start.
            </p>

            <ul className="mt-5 space-y-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600">
              {featured.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => go(`/services/${s.slug}`)}
                    disabled={navigating}
                    className="flex w-full items-center justify-between gap-4 bg-ink-900 p-4 text-left transition-colors hover:bg-ink-800 disabled:opacity-60"
                  >
                    <span className="min-w-0 text-sm leading-snug text-bone-100">{s.title}</span>
                    <span className="mono-tag shrink-0 text-[11px] text-lime-400">
                      {priceOf(s)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => go(contactHref)}
            disabled={navigating}
            className="btn btn-primary h-11 flex-1 gap-2 px-5 text-sm disabled:opacity-70"
          >
            {navigating ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Opening
              </>
            ) : (
              <>
                Get a fixed quote <ArrowRight size={15} />
              </>
            )}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShow(false)}
            className="btn h-11 gap-2 px-5 text-sm"
          >
            <FaWhatsapp size={16} className="text-[#25D366]" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
