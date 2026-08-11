import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { intakeByToken } from "@/lib/actions/intake";
import { intakeFieldsFor, intakeTitleFor } from "@/config/intakeFields";
import IntakeForm from "@/components/site/IntakeForm";
import { getAgency } from "@/lib/agency";
import { CheckCircle2 } from "lucide-react";
import { fmtDate } from "@/lib/datetime";

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
        {!request || request.isExpired ? (
          <div className="card p-8 text-center sm:p-10">
            <h1 className="text-2xl text-bone-50">This link is no longer valid</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-300">
              It may have expired or been revoked. Ask us for a fresh link and we will send it over.
            </p>
            <a href={`mailto:${agency.email}`} className="btn mt-6 inline-flex">
              {agency.email}
            </a>
          </div>
        ) : request.status !== "pending" ? (
          <div className="card p-8 text-center sm:p-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-semibold text-bone-50">Details Received</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-300">
              {request.recipientName ? `Thank you, ${request.recipientName}! ` : "Thank you! "}
              Your details were received by {agency.name} on{" "}
              <strong>{request.submittedAt ? fmtDate(request.submittedAt) : "record"}</strong>.
            </p>
            <p className="mt-4 text-xs text-bone-400">
              Your information is securely stored. No further action is needed on this link.
            </p>
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
