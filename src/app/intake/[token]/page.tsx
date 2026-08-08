import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { intakeByToken } from "@/lib/actions/intake";
import { intakeFieldsFor, intakeTitleFor } from "@/config/intakeFields";
import IntakeForm from "@/components/site/IntakeForm";
import { getAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";

// Never indexed. A live onboarding link in a search result would be a real
// problem, and a dead one in a search result is merely embarrassing.
export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false, follow: false },
};

/**
 * The public intake form.
 *
 * Deliberately outside `/nx-control` and `/portal` so the middleware lets it
 * through unauthenticated — the person filling it in has no account yet, which
 * is the entire point.
 *
 * `intakeByToken` returns the same null for an unknown, expired, used or
 * revoked token, so this page cannot be used to work out which tokens exist.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Both in parallel — the agency read is cached, but the lookup is not, and
  // there is no reason to make somebody on a phone wait for them in sequence.
  const [request, agency] = await Promise.all([intakeByToken(token), getAgency()]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <header className="border-b border-ink-600">
        <div className="mx-auto flex h-[68px] max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <span className="mono-tag text-lime-400">secure form</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {!request ? (
          <div className="card p-8 text-center sm:p-10">
            <h1 className="text-2xl text-bone-50">This link is no longer valid</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-300">
              It may have already been used, or it may have expired. Ask us for a fresh one and
              it will take two minutes.
            </p>
            <a href={`mailto:${agency.email}`} className="btn mt-6 inline-flex">
              {agency.email}
            </a>
          </div>
        ) : (
          <IntakeForm
            token={token}
            fields={intakeFieldsFor(request.kind)}
            title={intakeTitleFor(request.kind)}
            note={request.note}
          />
        )}
      </main>

      <footer className="border-t border-ink-600 py-6 text-center text-xs text-bone-500">
        © {new Date().getFullYear()} {agency.name} ·{" "}
        <Link href="/privacy" className="hover:text-bone-300">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
