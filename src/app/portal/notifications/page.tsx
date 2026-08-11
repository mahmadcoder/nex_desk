import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { listClientNotifications } from "@/lib/notifications";
import { describeKind, TONE_CLASS } from "@/config/notificationKinds";
import { fmtDayLabel, fmtTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { MarkOne, MarkAll } from "@/components/portal/ClientNotificationActions";
import { Bell } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function PortalNotifications({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const params = (await searchParams) ?? {};
  const readTab = params.show === "read";

  const items = await listClientNotifications(session.client.id, { read: readTab });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-600 pb-6">
        <div>
          <p className="mono-tag text-lime-400">Notifications</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
            What has changed.
          </h1>
        </div>
        {!readTab && items.length > 0 && <MarkAll />}
      </header>

      <div className="mt-6 flex gap-1 border-b border-ink-600">
        <Tab href="/portal/notifications" label="Unread" active={!readTab} />
        <Tab href="/portal/notifications?show=read" label="Earlier" active={readTab} />
      </div>

      {!items.length ? (
        <div className="card mt-8 p-10 text-center">
          <Bell className="mx-auto h-7 w-7 text-bone-500" aria-hidden />
          <p className="mt-4 text-sm text-bone-300">
            {readTab ? "Nothing here yet." : "You are all caught up."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {items.map((n: any) => {
            const style = describeKind(n?.kind ?? "");
            const Icon = style?.icon ?? Bell;
            const toneClass = (style?.tone && TONE_CLASS[style.tone]) ? TONE_CLASS[style.tone] : TONE_CLASS.default;

            return (
              <li
                key={n.id}
                className={cn(
                  "card flex items-start gap-3.5 p-4",
                  !n.read_at && "border-lime-400/20 bg-lime-400/[0.03]"
                )}
              >
                <span className={cn("mt-0.5 shrink-0", toneClass)}>
                  <Icon size={16} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-bone-100">{n.title}</p>
                  {n.body && (
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-bone-300">
                      {n.body}
                    </p>
                  )}
                  <p className="mono-tag mt-1.5 text-[10px]">
                    {fmtDayLabel(n.created_at)} · {fmtTime(n.created_at)}
                  </p>

                  {/* Stored, not derived — the link a notification was written
                      with stays right even if routes move. */}
                  {n.href && (
                    <Link
                      href={n.href}
                      className="mono-tag mt-2 inline-block text-[11px] text-lime-400 hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                </div>

                {!n.read_at && <MarkOne id={n.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3.5 py-2.5 text-sm transition-colors",
        active ? "font-medium text-lime-400" : "text-bone-400 hover:text-bone-100"
      )}
    >
      {label}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime-400" />}
    </Link>
  );
}
