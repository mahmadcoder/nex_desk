import Link from "next/link";
import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/site/LegalPage";
import { getAgency } from "@/lib/agency";
import { SECURITY_SECTIONS, SECURITY_PREAMBLE } from "@/config/security";
import { SUB_PROCESSORS } from "@/config/subprocessors";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Where your data lives, who can see it, how it is encrypted, and every third party involved in delivering the service.",
};

/** Bump when the wording changes materially. */
const UPDATED = "2026-08-08";

/**
 * The public security overview.
 *
 * Content comes from `config/security.ts` and `config/subprocessors.ts` — the
 * same two files the security PDF and the DPA read. A procurement team that
 * reads this page and then receives the PDF must not find two different
 * answers, so there is exactly one source and no prose duplicated here.
 */
export default async function Security() {
  const agency = await getAgency();

  const mail = (
    <a href={`mailto:${agency.email}`} className="text-lime-400 hover:underline">
      {agency.email}
    </a>
  );

  const sections: LegalSection[] = [
    ...SECURITY_SECTIONS.map((section) => ({
      id: section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      heading: section.title,
      body: (
        <ul className="space-y-3 pl-1">
          {section.points.map((point, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime-400" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ),
    })),
    {
      id: "sub-processors",
      heading: "Who else touches your data",
      body: (
        <>
          <p>
            Every third party involved in delivering the service, and what each one is for. This
            is the same list that appears in our data processing agreement — both read one file,
            so they cannot drift apart.
          </p>

          {/* Cards on a phone, a table from sm up. A four-column table at 390px
              either overflows the page or squeezes each cell to two words. */}
          <div className="mt-6 space-y-3 sm:hidden">
            {SUB_PROCESSORS.map((p) => (
              <div key={p.name} className="card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-bone-100">{p.name}</p>
                  {!p.handlesPersonalData && (
                    <span className="mono-tag shrink-0 text-[10px] text-bone-500">
                      no personal data
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-bone-300">{p.purpose}</p>
                <p className="mono-tag mt-2 text-[10px]">{p.location}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-600">
                  <th className="mono-tag pb-2 pr-4 text-[10px] font-normal">Service</th>
                  <th className="mono-tag pb-2 pr-4 text-[10px] font-normal">What it does</th>
                  <th className="mono-tag pb-2 text-[10px] font-normal">Where</th>
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((p) => (
                  <tr key={p.name} className="border-b border-ink-700 align-top">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-bone-100">{p.name}</span>
                      {!p.handlesPersonalData && (
                        <span className="mono-tag mt-1 block text-[10px] text-bone-500">
                          no personal data
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-bone-300">{p.purpose}</td>
                    <td className="py-3 text-bone-400">{p.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      id: "paperwork",
      heading: "The paperwork, if you need it",
      body: (
        <>
          <p>
            Three documents, all of which we will send signed rather than as a template to
            negotiate:
          </p>
          <ul className="space-y-2 pl-1">
            <li>
              <strong className="text-bone-100">Mutual NDA</strong> — before you tell us anything
              sensitive. Both directions, three years.
            </li>
            <li>
              <strong className="text-bone-100">Data processing agreement</strong> — the GDPR
              Article 28 terms. You are the controller, we are the processor, and it names every
              service in the table above.
            </li>
            <li>
              <strong className="text-bone-100">This document as a PDF</strong> — the same
              content, on letterhead, for a procurement file.
            </li>
          </ul>
          <p>
            Ask at {mail} and you will have them the same day. Our{" "}
            <Link href="/privacy" className="text-lime-400 hover:underline">
              privacy policy
            </Link>{" "}
            covers what we do with data about you rather than data you give us to process.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      eyebrow="Security"
      title="How we protect your data"
      updated={UPDATED}
      intro={
        <>
          <p>{SECURITY_PREAMBLE}</p>
          <p className="mt-4">
            Everything below is a statement of what {agency.name} does today, not what is
            planned. Where a control is manual we say manual — a security page is the one place
            an aspiration becomes a misrepresentation the moment somebody buys on it.
          </p>
        </>
      }
      sections={sections}
      footer={
        <p>
          Sending a security questionnaire? Send it to {mail}. A direct answer to your actual
          question is more useful than a longer document, and we would rather give you one.
        </p>
      }
    />
  );
}
