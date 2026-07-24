"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Inbox, Users, Handshake, FolderKanban,
  Receipt, FileText, Mail, Settings, LogOut, Menu, X,
  MessageSquareQuote, Briefcase, Layers, BookOpen, HelpCircle, UserCheck
} from "lucide-react";

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/emails", label: "Email centre", icon: Mail },
  { href: "/subscribers", label: "Subscribers & Broadcast", icon: UserCheck },
  { href: "/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/work", label: "Case Studies / Work", icon: Briefcase },
  { href: "/services", label: "Services Catalogue", icon: Layers },
  { href: "/blog", label: "Blog Posts", icon: BookOpen },
  { href: "/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ base, user }: { base: string; user: { name: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [path]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navContent = (
    <>
      <Link href={base} className="mb-8 flex items-center gap-2.5 px-2 pt-2">
        <LogoMark className="h-6 w-6 text-bone-50" />
        <div>
          <p className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Nex Desk
          </p>
          <p className="mono-tag text-[0.625rem]">control</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const full = `${base}${href}`;
          const active = href === "" ? path === base : path.startsWith(full);
          return (
            <Link
              key={href}
              href={full}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-ink-800 text-bone-50" : "text-bone-400 hover:bg-ink-800/60 hover:text-bone-200"
              )}
            >
              <Icon size={16} strokeWidth={1.75} className={active ? "text-lime-400" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-600 pt-4">
        <div className="px-3 pb-3">
          <p className="truncate text-sm">{user.name}</p>
          <p className="mono-tag text-[0.625rem]">{user.role}</p>
        </div>
        <form action={signOut}>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-bone-400 hover:bg-ink-800/60 hover:text-bone-200">
            <LogOut size={16} strokeWidth={1.75} /> Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-600 bg-ink-950 px-4 lg:hidden">
        <Link href={base} className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 text-bone-50" />
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>Nex Desk</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-bone-400 hover:bg-ink-800 hover:text-bone-50"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-600 bg-ink-950 p-4 transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-600 bg-ink-950 p-4 lg:flex">
        {navContent}
      </aside>
    </>
  );
}
