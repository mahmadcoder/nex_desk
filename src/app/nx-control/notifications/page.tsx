import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth/staff";
import { fmtDayLabel, fmtTime } from "@/lib/datetime";
import { PageHead, Empty } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { listNotifications, notificationCounts } from "@/lib/notifications";
import { describeKind, TONE_CLASS } from "@/config/notificationKinds";
import { MarkReadButton, MarkAllReadButton } from "@/components/admin/NotificationActions";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

// This page renders on the server, which on Vercel is UTC. Both labels used to
// compute there, so a notification raised at 9pm Karachi showed as 16:00 and
// sat under a "Yesterday" heading while it was still happening.
const dayLabel = fmtDayLabel;
const timeLabel = fmtTime;


export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const { tab } = await searchParams;
  const showRead = tab === "read";

  const [rows, counts] = await Promise.all([
    listNotifications(me, { read: showRead }),
    notificationCounts(me),
  ]);

  // Grouped by day so a busy morning reads as a morning, not as a wall.
  const groups = new Map<string, any[]>();
  for (const n of rows) {
    const key = dayLabel(n.created_at);
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  return (
    <>
      <PageHead
        title="Notifications"
        sub={
          me.isPrivileged
            ? "What your clients and your team have done, in one place."
            : "Work assigned to you, and decisions on your requests."
        }
        action={!showRead ? <MarkAllReadButton count={counts.unread} /> : undefined}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: "", label: "Unread", count: counts.unread },
          { key: "read", label: "Read", count: counts.read },
        ].map((t) => {
          const active = showRead === (t.key === "read");
          return (
            <Link
              key={t.label}
              href={t.key ? `${BASE}/notifications?tab=read` : `${BASE}/notifications`}
              className={cn(
                "mono-tag rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                active
                  ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                  : "border-ink-600 text-bone-300 hover:border-ink-400 hover:text-bone-100"
              )}
            >
              {t.label} <span className="ml-1 opacity-60">{t.count}</span>
            </Link>
          );
        })}
      </div>

      {!rows.length ? (
        <Empty
          title={showRead ? "Nothing read yet" : "You are all caught up"}
          body={
            showRead
              ? "Notifications you have dealt with appear here."
              : "When a client accepts an agreement, ticks a kickoff item, approves a milestone or asks for a change, it lands here."
          }
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day}>
              <p className="mono-tag mb-2 text-[11px]">{day}</p>
              <ul className="card divide-y divide-ink-700 overflow-hidden">
                {items.map((n) => {
                  const style = describeKind(n.kind);
                  const Icon = style.icon;

                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 p-4",
                        !n.read_at && "bg-lime-400/[0.03]"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn("mt-0.5 shrink-0", TONE_CLASS[style.tone])}
                        aria-hidden
                      />

                      <div className="min-w-0 flex-1">
                        <p className="mono-tag text-[10px]">{style.label}</p>

                        {/* The whole title is the link when there is somewhere
                            to go — reading a notification and acting on it are
                            the same motion. */}
                        {n.href ? (
                          <Link
                            href={n.href}
                            className="mt-0.5 block text-sm text-bone-100 hover:text-lime-400"
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <p className="mt-0.5 text-sm text-bone-100">{n.title}</p>
                        )}

                        {n.body && (
                          <p className="mt-0.5 text-xs leading-relaxed text-bone-300">{n.body}</p>
                        )}

                        <p className="mt-1 text-[11px] text-bone-400">
                          {n.actor_label ? `${n.actor_label} · ` : ""}
                          {timeLabel(n.created_at)}
                        </p>
                      </div>

                      <MarkReadButton id={n.id} read={!!n.read_at} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {me.isPrivileged && !showRead && (
        <p className="mt-6 text-[11px] leading-relaxed text-bone-300">
          Marking something read clears it for everyone with admin access — the useful question
          is whether it has been dealt with, not whether each of you has personally seen it.
        </p>
      )}
    </>
  );
}
