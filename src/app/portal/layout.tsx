import { getPortalSessionOptional } from "@/lib/portal/session";
import PortalSidebar from "@/components/portal/PortalSidebar";
import { unreadClientCount } from "@/lib/notifications";

export const metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};

/**
 * The portal frame.
 *
 * Was a header and nothing else, above a single 714-line page — so every
 * agreement, milestone, invoice, document and expense was stacked down one
 * scroll with no way to tell where you were. The sidebar is the fix; the
 * routes beside it are the rest of it.
 *
 * `/portal/login` and `/portal/auth` sit under this layout too, and a signed-out
 * visitor must not be redirected from the login page back to the login page —
 * hence the session is read here but a missing one renders bare children.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The optional form on purpose — see the note on it. This layout also wraps
  // /portal/login, so a redirect here would loop.
  const session = await getPortalSessionOptional();

  // Signed out, or signed in with no client row: render the page bare. Login
  // draws its own screen; the dashboard draws the "no project profile" card.
  if (!session) {
    return <div className="min-h-screen bg-ink-900">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-ink-900">
      <PortalSidebar
        client={{
          name: session.client.name,
          company: session.client.company,
          avatar_url: session.client.avatar_url,
        }}
        perms={session.perms as unknown as Record<string, boolean>}
        counts={{ "/notifications": await unreadClientCount(session.client.id) }}
      />

      {/* pt-14 clears the fixed mobile top bar; the desktop sidebar is in flow
          so no offset is needed there. */}
      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 sm:px-6 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
