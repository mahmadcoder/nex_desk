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
  MessageSquareQuote, Briefcase, Layers, BookOpen, HelpCircle, UserCheck, Clock, ListChecks, CalendarDays, PackageCheck, TrendingUp, CalendarClock, Bell, Wallet, Scale, ShoppingBag, UserCircle, BarChart3, ShieldCheck, Building2, UserPlus, LifeBuoy, FileSpreadsheet, ClipboardList
} from "lucide-react";
import Avatar from "@/components/Avatar";

const NAV_SECTIONS = [
  {
    title: "CRM & REVENUE",
    items: [
      { href: "", label: "Dashboard", icon: LayoutDashboard },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/leads", label: "Leads", icon: Inbox },
      { href: "/intake", label: "Request Details", icon: ClipboardList },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/employees", label: "Employees & Staff", icon: UserCheck },
      { href: "/hr", label: "HR & Departments", icon: Building2 },
      { href: "/recruitment", label: "Recruitment", icon: UserPlus },
      { href: "/payroll", label: "Payroll Run", icon: Wallet },
      { href: "/daily-logs", label: "Daily Work Logs", icon: Clock },
      { href: "/meetings", label: "Meetings", icon: CalendarClock },
      { href: "/tickets", label: "Support Tickets", icon: LifeBuoy },
      { href: "/attendance", label: "Attendance", icon: UserCheck },
      // Admins clock in too, so they need somewhere to see their own month.
      { href: "/my-attendance", label: "My Attendance", icon: UserCheck },
      { href: "/timesheets", label: "Timesheets", icon: Clock },
      { href: "/leave", label: "Leave", icon: CalendarDays },
      { href: "/deals", label: "Deals", icon: Handshake },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/tasks", label: "Task Board", icon: ListChecks },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/completed", label: "Completed", icon: PackageCheck },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/expenses", label: "Agency Expenses", icon: Wallet },
      { href: "/profit", label: "Profitability", icon: TrendingUp },
      { href: "/forecast", label: "Cash Flow", icon: CalendarClock },
      { href: "/books", label: "Money In & Out", icon: Scale },
      { href: "/insights", label: "Insights", icon: BarChart3 },
      { href: "/reports", label: "Reports", icon: FileSpreadsheet },
      { href: "/purchases", label: "Purchases", icon: ShoppingBag },
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/emails", label: "Email Centre", icon: Mail },
    ],
  },
  {
    title: "CMS & MARKETING",
    items: [
      { href: "/subscribers", label: "Subscribers & Broadcast", icon: UserCheck },
      { href: "/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/work", label: "Case Studies / Work", icon: Briefcase },
      { href: "/services", label: "Services Catalogue", icon: Layers },
      { href: "/blog", label: "Blog Posts", icon: BookOpen },
      { href: "/faqs", label: "FAQs", icon: HelpCircle },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { href: "/handbook", label: "Handbook", icon: BookOpen },
      { href: "/audit", label: "Audit Log", icon: ShieldCheck },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/**
 * What a `staff` employee may reach. Owners and admins see everything.
 * Kept in sync with the server-side guard in `lib/auth/staffAccess.ts` — the
 * menu only hides links, the guard is what actually enforces this.
 */
const STAFF_NAV = [
  {
    title: "MY WORK",
    items: [
      { href: "", label: "Dashboard", icon: LayoutDashboard },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/intake", label: "Request Details", icon: ClipboardList },
      { href: "/clients", label: "My Clients", icon: Users },
      { href: "/projects", label: "My Projects", icon: FolderKanban },
      { href: "/tasks", label: "My Tasks", icon: ListChecks },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/daily-logs", label: "Daily Work Logs", icon: Clock },
      // Scoped to their assigned clients only — enforced on the page itself.
      { href: "/meetings", label: "My Meetings", icon: CalendarClock },
      { href: "/tickets", label: "Tickets", icon: LifeBuoy },
      { href: "/leave", label: "My Leave", icon: CalendarDays },
      // Their own record only. Everyone else's lives at /attendance, which
      // staff cannot reach.
      { href: "/my-attendance", label: "My Attendance", icon: UserCheck },
      { href: "/handbook", label: "Handbook", icon: BookOpen },
      { href: "/my-pay", label: "My Pay", icon: Wallet },
      { href: "/profile", label: "My Profile", icon: UserCircle },
    ],
  },
];

export default function Sidebar({
  base,
  user,
  counts = {},
}: {
  base: string;
  user: { name: string; role: string; avatarUrl?: string | null };
  /**
   * Badge numbers keyed by item href. Deliberately generic rather than an
   * `unread` prop — a pending-leave count can use the same slot later without
   * another prop.
   */
  counts?: Record<string, number>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sections = user.role === "staff" ? STAFF_NAV : NAV_SECTIONS;

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [path]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navContent = (
    <div className="flex h-full flex-col min-h-0">
      <Link href={base} className="mb-5 flex items-center gap-2.5 px-2 pt-2 shrink-0">
        <LogoMark className="h-6 w-6 text-bone-50" />
        <div>
          <p className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Nex Desk
          </p>
          <p className="mono-tag text-[0.625rem]">control</p>
        </div>
      </Link>

      {/* Scrolls, but without a visible scrollbar — the nav is short enough that
          a bar sitting over the menu was pure noise. */}
      <nav className="no-scrollbar flex-1 overflow-y-auto min-h-0 space-y-5 pr-1.5">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] font-mono font-semibold tracking-wider text-bone-300 uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const full = `${base}${href}`;
                const active = href === "" ? path === base : path.startsWith(full);
                return (
                  <Link
                    key={href}
                    href={full}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-lime-400/10 text-lime-400 font-semibold border border-lime-400/20 shadow-sm"
                        : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
                    )}
                  >
                    <Icon size={15} strokeWidth={1.75} className={active ? "text-lime-400" : "text-bone-400"} />
                    <span className="truncate">{label}</span>
                    {!!counts[href] && (
                      <span className="ml-auto shrink-0 rounded-full bg-lime-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-lime-950">
                        {counts[href] > 99 ? "99+" : counts[href]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-600/80 pt-3 shrink-0 mt-2">
        {/* min-w-0 on the text column so a long name truncates instead of
            pushing the avatar out of the 240px sidebar. */}
        <Link
          href={`${base}/profile`}
          className="flex items-center gap-2.5 rounded-md px-3 py-1.5 pb-2 hover:bg-ink-800/60 transition-colors"
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-bone-200">{user.name}</p>
            <p className="mono-tag text-[0.625rem] capitalize text-lime-400/80">{user.role}</p>
          </div>
        </Link>
        <form action={signOut}>
          <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-bone-400 hover:bg-ink-800/60 hover:text-rose-400 transition-colors">
            <LogOut size={15} strokeWidth={1.75} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-600 bg-ink-950 px-4 lg:hidden">
        <Link href={base} className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 text-bone-50" />
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>Nex Desk</span>
        </Link>
        {/* On a phone this bar is the only chrome that is always on screen, so
            it is where the avatar earns its place. */}
        <div className="flex items-center gap-2">
          <Link href={`${base}/profile`} aria-label="My profile">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-bone-400 hover:bg-ink-800 hover:text-bone-50"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
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
