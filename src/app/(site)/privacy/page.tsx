import Link from "next/link";
import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/site/LegalPage";
import { getAgency } from "@/lib/agency";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What we collect, why we hold it, who else can see it, and how to get a copy or have it deleted.",
};

/** Bump this whenever the wording changes materially. */
const UPDATED = "2026-08-06";

export default async function Privacy() {
  const agency = await getAgency();

  const mail = (
    <a href={`mailto:${agency.email}`} className="text-lime-400 hover:underline">
      {agency.email}
    </a>
  );

  const sections: LegalSection[] = [
    {
      id: "what-we-collect",
      heading: "What we collect",
      body: (
        <>
          <p>Only what we need to quote a job and then run it:</p>
          <ul className="space-y-2 pl-1">
            <li>
              <strong className="text-bone-100">When you enquire</strong> — your name, email,
              phone, company, city and country, and whatever you tell us about the project.
            </li>
            <li>
              <strong className="text-bone-100">When you become a client</strong> — the same,
              plus your billing address, tax number if you have one, the agreements you sign,
              the invoices we raise and the payments you make.
            </li>
            <li>
              <strong className="text-bone-100">In your client portal</strong> — anything you
              upload, and the fact that you signed in, so we can tell whether you have seen a
              document.
            </li>
            <li>
              <strong className="text-bone-100">If you subscribe</strong> — your email address,
              nothing else.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "what-we-dont",
      heading: "What we do not collect",
      body: (
        <>
          <p>
            We do not buy data about you, we do not build a profile of you across other
            websites, and we do not run advertising pixels. We have never sold anyone&rsquo;s
            data and have no plans to.
          </p>
          <p>
            We do not ask for card numbers. Payment is by bank transfer, and we only ever see
            the reference and the amount that arrived.
          </p>
        </>
      ),
    },
    {
      id: "why",
      heading: "Why we hold it",
      body: (
        <>
          <p>
            To reply to you, to write your quote and agreement, to invoice you, to run your
            project, and to keep the records that tax law requires. That is the whole list.
          </p>
          <p>
            We send you email about your own project because you hired us. We only send
            marketing email if you asked for it, and every one of those has an unsubscribe
            link that works.
          </p>
        </>
      ),
    },
    {
      id: "who-else",
      heading: "Who else can see it",
      body: (
        <>
          <p>
            We use a small number of companies to actually run the business. Each one only
            sees what it needs to do its job:
          </p>
          <ul className="space-y-2 pl-1">
            <li>
              <strong className="text-bone-100">Supabase</strong> — our database and file
              storage. Everything is here: your record, your documents, your invoices.
            </li>
            <li>
              <strong className="text-bone-100">Vercel</strong> — hosting for this website and
              your client portal.
            </li>
            <li>
              <strong className="text-bone-100">Google (Gmail)</strong> — sends every email we
              send you.
            </li>
            <li>
              <strong className="text-bone-100">Google (Gemini)</strong> — we use AI to help
              draft text such as project summaries and reports. When we do, the text being
              drafted is sent to Google to process. We do not send it your credentials,
              passwords, or payment details.
            </li>
          </ul>
          <p>
            <strong className="text-bone-100">Your data is stored outside Pakistan</strong>, on
            servers operated by the companies above. If you are in the UK or EU, that means
            your information is transferred internationally to be processed.
          </p>
          <p>
            Beyond those, we share nothing — no partners, no resellers, no data brokers. The
            only other case is if a court or the tax authority requires it by law.
          </p>
        </>
      ),
    },
    {
      id: "how-long",
      heading: "How long we keep it",
      body: (
        <>
          <p>
            <strong className="text-bone-100">Enquiries that go nowhere:</strong> deleted once
            it is clear nothing is happening.
          </p>
          <p>
            <strong className="text-bone-100">Client records, agreements, invoices and
            payments:</strong> kept for as long as tax and accounting rules require us to. That
            is the one category we cannot delete on request while the retention period runs.
          </p>
          <p>
            <strong className="text-bone-100">Project files and portal uploads:</strong> kept
            while we work together, and for a reasonable period afterwards so you can still
            reach them. Ask and we will remove them sooner.
          </p>
        </>
      ),
    },
    {
      id: "your-rights",
      heading: "Your rights, and how to use them",
      body: (
        <>
          <p>You can ask us at any time to:</p>
          <ul className="space-y-2 pl-1">
            <li>send you a copy of everything we hold about you;</li>
            <li>correct anything that is wrong;</li>
            <li>delete it, subject to the tax records above;</li>
            <li>stop sending you marketing email;</li>
            <li>explain anything on this page in plainer words.</li>
          </ul>
          <p>
            Email {mail} and we will come back to you within 30 days. There is no form and no
            charge. If you are unhappy with how we handled it, you can complain to the data
            protection authority where you live.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      heading: "Cookies",
      body: (
        <>
          <p>
            <strong className="text-bone-100">Essential cookies</strong> keep you signed in to
            the client portal and keep the admin panel secure. Without them the portal cannot
            work, so these are always on.
          </p>
          <p>
            <strong className="text-bone-100">Non-essential cookies</strong> — the banner on
            your first visit asks whether you accept these. We use your answer to decide
            whether any analytics run. If you decline, none do. You can change your mind by
            clearing this site&rsquo;s data in your browser, which brings the banner back.
          </p>
          <p>
            We do not use advertising cookies and there are no third-party trackers embedded
            in these pages.
          </p>
        </>
      ),
    },
    {
      id: "security",
      heading: "Keeping it safe",
      body: (
        <>
          <p>
            Everything travels over an encrypted connection. Access to the admin panel is
            restricted to our own staff, and stored credentials — the logins we hold for your
            hosting or domain — are encrypted in the database rather than kept as plain text.
          </p>
          <p>
            No system is perfect. If something did go wrong in a way that affected your data,
            we would tell you rather than hope you did not notice.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Privacy"
      updated={UPDATED}
      sections={sections}
      intro={
        <p>
          This explains what {agency.name} does with your information — in plain words, because
          a privacy policy nobody can read protects nobody. If anything here is unclear, ask
          us and we will explain it.
        </p>
      }
      footer={
        <p>
          {agency.name}, {agency.location}. Questions about this page, or about the data we
          hold on you, go to {mail}. See also our{" "}
          <Link href="/terms" className="text-lime-400 hover:underline">
            terms of service
          </Link>
          .
        </p>
      }
    />
  );
}
