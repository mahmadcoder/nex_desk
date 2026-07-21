"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Inbox, Users, Handshake, FolderKanban,
  Receipt, FileText, Mail, Settings, LogOut,
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
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ base, user }: { base: string; user: { name: string; role: string } }) {
  const path = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-ink-600 bg-ink-950 p-4">
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
    </aside>
  );
}
