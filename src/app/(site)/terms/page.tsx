import Link from "next/link";
import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/site/LegalPage";
import { getAgency } from "@/lib/agency";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "How we quote, how payment works, when you own the code, what the warranty covers, and what happens if a project is cancelled.",
};

/** Bump this whenever the wording changes materially. */
const UPDATED = "2026-08-06";

export default async function Terms() {
  const agency = await getAgency();

  const mail = (
    <a href={`mailto:${agency.email}`} className="text-lime-400 hover:underline">
      {agency.email}
    </a>
  );

  const sections: LegalSection[] = [
    {
      id: "your-agreement-wins",
      heading: "Your signed agreement always wins",
      body: (
        <>
          <p>
            This page covers the website and anything not written down elsewhere. The terms
            that actually govern your project are the ones in the agreement PDF you signed.
          </p>
          <p>
            Where the two disagree, <strong className="text-bone-100">your agreement wins</strong>
            . We will not use a line on a web page to override something we put in writing to
            you.
          </p>
        </>
      ),
    },
    {
      id: "prices-and-quotes",
      heading: "Prices here are starting points",
      body: (
        <>
          <p>
            Every price on this site is a guide so you know roughly what to expect. None of
            them is an offer.
          </p>
          <p>
            A price becomes real when we send you a written quote as a PDF and you accept it.
            That quote lists the scope, the deliverables, the timeline and what is excluded. If
            something is not in the quote, it is not in the price.
          </p>
        </>
      ),
    },
    {
      id: "payment",
      heading: "Payment",
      body: (
        <>
          <p>
            Work starts when the advance payment clears — not when it is sent, and not when
            the agreement is signed. Later stages are invoiced as set out in your agreement&rsquo;s
            payment schedule.
          </p>
          <p>
            Invoices are due by the date printed on them. If one goes unpaid we will chase it
            by email first. Work may pause on an overdue invoice, and we will tell you before
            it does rather than after.
          </p>
          <p>
            Bank charges on a payment to us are yours; charges on a payment from us are ours.
            You pay in the currency on the invoice.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      heading: "Changes to the work",
      body: (
        <>
          <p>
            You can ask for changes at any point. Anything outside the agreed scope is quoted
            first, in writing, and only starts once you approve it. Nothing extra is ever
            added to your bill without a quote you accepted.
          </p>
          <p>
            You can raise a change request yourself from your client portal, and see what
            stage it is at.
          </p>
        </>
      ),
    },
    {
      id: "ownership",
      heading: "When you own it",
      body: (
        <>
          <p>
            On final payment, full ownership of the source code, design files, content and any
            accounts we created for the project transfers to you. We keep no licence and no
            claim over them, and we keep a copy only so we can support you.
          </p>
          <p>
            Until final payment, that work remains ours. This is the only leverage a small
            studio has, and it is why the transfer is written down rather than assumed.
          </p>
          <p>
            Third-party components — open-source libraries, fonts, stock images, plugins — stay
            under their own licences. We will tell you where any of that applies.
          </p>
        </>
      ),
    },
    {
      id: "warranty",
      heading: "The warranty after launch",
      body: (
        <>
          <p>
            Anything <strong className="text-bone-100">broken in what we built</strong> we fix
            free for <strong className="text-bone-100">14 days</strong> from handover. The exact
            end date is printed on your handover certificate and shown in your portal.
          </p>
          <p>That does not cover:</p>
          <ul className="space-y-2 pl-1">
            <li>new features or changes of mind — those are quoted as change requests;</li>
            <li>third-party services going down or changing their API;</li>
            <li>changes someone else makes to the code after we hand it over;</li>
            <li>content updates and ordinary maintenance.</li>
          </ul>
          <p>
            After the warranty ends, we still fix things — it is just quoted first, so you know
            the cost before we start. A monthly retainer covering updates, backups and
            monitoring is available if you would rather not think about it.
          </p>
        </>
      ),
    },
    {
      id: "cancelling",
      heading: "If a project is cancelled",
      body: (
        <>
          <p>
            Either of us can stop. If you cancel, you pay for the work completed up to that
            point, and everything produced so far is yours to keep.
          </p>
          <p>
            How any refund is worked out — including the booking fee and how bank charges are
            handled — is set out in the cancellation section of your signed agreement. It is
            written down before you pay, on purpose, so it is never negotiated under pressure
            afterwards.
          </p>
          <p>Once a project has been handed over and paid for, there is no refund. Defects are covered by the warranty above.</p>
        </>
      ),
    },
    {
      id: "your-side",
      heading: "What we need from you",
      body: (
        <>
          <p>
            Projects stall on content and decisions far more often than on code. We need
            copy, images, access and answers within a reasonable time; where a delay on your
            side moves the deadline, we will say so at the time rather than at the end.
          </p>
          <p>
            You confirm that anything you send us — text, images, logos, data — is yours to
            use.
          </p>
        </>
      ),
    },
    {
      id: "portfolio",
      heading: "Showing the work",
      body: (
        <p>
          We may show finished work in our portfolio and case studies. If you would rather we
          did not, tell us in writing and we will not — before or after launch, no reason
          needed.
        </p>
      ),
    },
    {
      id: "liability",
      heading: "Limits",
      body: (
        <>
          <p>
            We do everything we reasonably can to deliver working software, but we cannot
            promise a website will never go down, that a third-party service will keep working,
            or that any particular commercial result will follow.
          </p>
          <p>
            Where the law allows it to be limited, our liability for any claim is capped at
            the total amount you paid us for that project. We are not liable for lost profits
            or indirect losses.
          </p>
          <p>Nothing here limits liability for fraud, or for anything that cannot legally be limited.</p>
        </>
      ),
    },
    {
      id: "law",
      heading: "Which law applies",
      body: (
        <p>
          These terms are governed by the laws of Pakistan, and the courts of Pakistan have
          jurisdiction. If you are contracting from elsewhere and need something different,
          raise it before signing and we will discuss it.
        </p>
      ),
    },
    {
      id: "updates",
      heading: "Changes to this page",
      body: (
        <p>
          We may update these terms. The date at the top always shows when. Changes apply to
          new work from the date they are published, and never retroactively to an agreement
          you have already signed.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="Terms of service"
      updated={UPDATED}
      sections={sections}
      intro={
        <p>
          The rules of working with {agency.name}, written the way we would explain them on a
          call. If a clause here would surprise you, that is our fault — tell us and we will
          reword it.
        </p>
      }
      footer={
        <p>
          {agency.name}, {agency.location}. Questions go to {mail}. See also our{" "}
          <Link href="/privacy" className="text-lime-400 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      }
    />
  );
}
