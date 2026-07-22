"use client";

/**
 * UI mockups drawn in code. These stand in for screenshots of real work and
 * give the site a custom, product-shop feel that stock photography can't.
 * Everything is divs and SVG — no images, nothing to break, and it all
 * inherits the Nex Noir palette so it always matches.
 */

import { cn } from "@/lib/utils";

/* ---------------- Browser chrome wrapper ---------------- */

export function BrowserFrame({
  url = "nexdesk.com",
  children,
  className,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-ink-600 bg-ink-800 shadow-2xl", className)}>
      <div className="flex items-center gap-2 border-b border-ink-600 bg-ink-900 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
        <span className="mono-tag ml-3 flex-1 truncate rounded-md bg-ink-800 px-3 py-1 text-[0.625rem]">
          {url}
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------------- Analytics dashboard ---------------- */

export function DashboardMockup({ className }: { className?: string }) {
  const bars = [42, 68, 55, 80, 62, 95, 73, 88];
  return (
    <div className={cn("bg-ink-900 p-5", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="mono-tag text-[0.625rem]">Monthly revenue</p>
          <p className="mt-1 text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            $48,290
          </p>
        </div>
        <span className="rounded-full bg-lime-400/15 px-2.5 py-1 text-[0.625rem] font-medium text-lime-400">
          ▲ 24%
        </span>
      </div>

      <div className="mt-5 flex h-24 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t"
            style={{ height: `${h}%`, background: i === 5 ? "var(--color-lime-400)" : "var(--color-ink-600)" }} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[["Users", "12.4k"], ["Sessions", "38k"], ["Conv.", "3.8%"]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-ink-600 bg-ink-800 p-2.5">
            <p className="mono-tag text-[0.5625rem]">{l}</p>
            <p className="mt-0.5 text-sm">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Mobile app screen ---------------- */

export function MobileMockup({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-[180px] overflow-hidden rounded-[2rem] border-[6px] border-ink-700 bg-ink-900", className)}>
      <div className="flex justify-center py-2">
        <span className="h-1 w-14 rounded-full bg-ink-600" />
      </div>
      <div className="px-4 pb-6">
        <p className="mono-tag text-[0.5625rem]">Good morning</p>
        <p className="mt-1 text-lg tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Your desk</p>

        <div className="mt-4 rounded-xl bg-lime-400 p-3 text-lime-950">
          <p className="text-[0.625rem] font-medium opacity-70">Active project</p>
          <p className="mt-1 text-sm font-medium">Website rebuild</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lime-950/20">
            <div className="h-1.5 rounded-full bg-lime-950" style={{ width: "72%" }} />
          </div>
        </div>

        {["Design approved", "Staging live", "Content review"].map((t, i) => (
          <div key={t} className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-800 p-2.5">
            <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[8px]",
              i < 2 ? "bg-lime-400 text-lime-950" : "border border-ink-500")}>
              {i < 2 ? "✓" : ""}
            </span>
            <span className="text-[0.6875rem]">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Code editor ---------------- */

export function CodeMockup({ className }: { className?: string }) {
  const lines: [number, string][] = [
    [6, "export function ship() {"],
    [10, "  const build = await bundle()"],
    [8, "  await deploy(build)"],
    [12, "  return { status: 'live' }"],
    [4, "}"],
  ];
  return (
    <div className={cn("bg-ink-950 p-5 font-mono text-[0.6875rem] leading-relaxed", className)}>
      {lines.map(([w, code], i) => (
        <div key={i} className="flex gap-4">
          <span className="text-ink-500">{i + 1}</span>
          <span className={i === 2 ? "text-lime-400" : "text-bone-300"} style={{ paddingLeft: `${(w - 4) * 2}px` }}>
            {code}
          </span>
        </div>
      ))}
      <div className="mt-3 flex items-center gap-2 border-t border-ink-700 pt-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
        <span className="text-ink-400">deployed in 1.2s</span>
      </div>
    </div>
  );
}

/* ---------------- Search ranking ---------------- */

export function SeoMockup({ className }: { className?: string }) {
  const rows = [
    ["your brand", 1, true],
    ["best agency near me", 2, true],
    ["web design services", 4, false],
  ] as const;
  return (
    <div className={cn("bg-ink-900 p-5", className)}>
      <p className="mono-tag text-[0.625rem]">Keyword rankings</p>
      <div className="mt-4 space-y-2.5">
        {rows.map(([kw, pos, up]) => (
          <div key={kw} className="flex items-center justify-between rounded-lg border border-ink-600 bg-ink-800 px-3 py-2.5">
            <span className="text-[0.75rem] text-bone-300">{kw}</span>
            <span className="flex items-center gap-2">
              <span className="mono-tag text-[0.625rem]">#{pos}</span>
              <span className={cn("text-[0.625rem]", up ? "text-lime-400" : "text-bone-400")}>
                {up ? "▲" : "▼"}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="mono-tag text-[0.5625rem]">organic traffic</p>
        <svg viewBox="0 0 120 40" className="h-10 w-32">
          <polyline points="0,35 20,32 40,28 60,20 80,16 100,8 120,4"
            fill="none" stroke="var(--color-lime-400)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
