"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  FileText,
  UserCircle,
  CalendarClock,
  Bell,
  LifeBuoy,
  LogOut,
  Menu,
  X,
} from "lucide-react";

/**
 * The portal's navigation.
 *
 * A separate component rather than another branch inside `admin/Sidebar` —
 * that file already switches on `user.role` internally, and the portal's links,
 * permission gating and sign-out route all differ. It deliberately mirrors the
 * same classes and drawer behaviour so the two feel like one product.
 *
 * The portal used to be a single 714-line page with no routes at all, which is
 * why a client could never tell where they were.
 */

const ITEMS = [
  { href: "", label: "Dashboard", icon: LayoutDashboard, perm: null },
  { href: "/notifications", label: "Notifications", icon: Bell, perm: null },
  { href: "/projects", label: "Projects", icon: FolderKanban, perm: null },
  { href: "/meetings", label: "Meetings", icon: CalendarClock, perm: null },
  { href: "/invoices", label: "Invoices", icon: Receipt, perm: "show_invoices" },
  { href: "/documents", label: "Documents", icon: FileText, perm: "show_files" },
  { href: "/support", label: "Support", icon: LifeBuoy, perm: null },
  { href: "/account", label: "Account", icon: UserCircle, perm: null },
] as const;

export default function PortalSidebar({
  client,
  perms,
  counts = {},
}: {
  client: { name: string; company?: string | null; avatar_url?: string | null };
  perms: Record<string, boolean>;
  /** Badge numbers keyed by item href, same shape as the admin sidebar. */
  counts?: Record<string, number>;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/portal/login?logged_out=1");
    router.refresh();
  };

  // Hiding the link is presentation only — every gated route re-checks the same
  // flag server-side through `requirePortalPerm`.
  const items = ITEMS.filter((i) => !i.perm || perms[i.perm] !== false);

  const navContent = (
    <div className="flex h-full min-h-0 flex-col">
      <Link href="/portal" className="mb-5 flex shrink-0 items-center gap-2.5 px-2 pt-2">
        <LogoMark className="h-6 w-6 text-bone-50" />
        <div>
          <p
            className="text-sm font-medium tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nex Desk
          </p>
          <p className="mono-tag text-[0.625rem]">client portal</p>
        </div>
      </Link>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const full = `/portal${href}`;
          const active = href === "" ? path === "/portal" : path.startsWith(full);
          return (
            <Link
              key={href}
              href={full}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                active
                  ? "border border-lime-400/20 bg-lime-400/10 font-semibold text-lime-400 shadow-sm"
                  : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
              )}
            >
              <Icon
                size={15}
                strokeWidth={1.75}
                className={active ? "text-lime-400" : "text-bone-400"}
              />
              <span className="truncate">{label}</span>
              {!!counts[href] && (
                <span className="ml-auto shrink-0 rounded-full bg-lime-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-lime-950">
                  {counts[href] > 99 ? "99+" : counts[href]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 shrink-0 border-t border-ink-600/80 pt-3">
        {/* min-w-0 so a long company name truncates instead of pushing the
            avatar out of the sidebar. */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 pb-2">
          <Avatar name={client.name} src={client.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-bone-200">{client.name}</p>
            {client.company && (
              <p className="mono-tag truncate text-[0.625rem] text-lime-400/80">
                {client.company}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-bone-400 transition-colors hover:bg-ink-800/60 hover:text-rose-400"
        >
          <LogOut size={15} strokeWidth={1.75} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-600 bg-ink-950 px-4 lg:hidden">
        <Link href="/portal" className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 text-bone-50" />
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>
            Nex Desk
          </span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-bone-400 hover:bg-ink-800 hover:text-bone-50"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-600 bg-ink-950 p-4 transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-600 bg-ink-950 p-4 lg:flex">
        {navContent}
      </aside>
    </>
  );
}
