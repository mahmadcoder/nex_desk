import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { loadBilling, loadProjects } from "@/lib/portal/data";
import { money, CONTACT_EMAIL, CONTACT_WHATSAPP, whatsappLink } from "@/lib/utils";
import AcceptAgreement from "@/components/portal/AcceptAgreement";
import ReturnRequest from "@/components/portal/ReturnRequest";
import SupportWindow from "@/components/SupportWindow";
import { MessageCircle } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function PortalAccount() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const { client, isPaused } = session;
  const [billing, { projects }] = await Promise.all([
    loadBilling(client.id),
    loadProjects(client.id),
  ]);

  // Only delivered projects have a support window to report on; SupportWindow
  // itself decides what to say about each one.
  const supported = projects.filter((p: any) => p.delivered_at);

  return (
    <>
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Account</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          Your agreements and account.
        </h1>
        <p className="mt-2 text-sm text-bone-300">
          {client.name}
          {client.company ? ` · ${client.company}` : ""} · {client.email}
        </p>
      </header>

      {isPaused && (
        <section className="card mt-8 border-lime-400/25 bg-lime-400/[0.04] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-xl">
              <span className="mono-tag text-xs text-lime-400">Account paused</span>
              <h2 className="mt-2 text-lg font-semibold text-bone-50">
                We are not working on anything for you right now.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-bone-300">
                Everything from our work together stays here and it is yours to download at any
                time. New requests and uploads are switched off while things are paused.
                Whenever you want to start something again, tell us here.
              </p>
            </div>
            <ReturnRequest
              clientName={String(client.name ?? "")}
              alreadyRequested={!!client.return_requested_at}
            />
          </div>
        </section>
      )}

      {/* Agreements waiting on the client. Accepting here replaces print, sign,
          scan and upload — three chances to lose momentum. */}
      {!!billing.deals.length && (
        <section className="mt-8">
          <h2 className="mono-tag mb-3">Agreements</h2>
          <div className="space-y-2.5">
            {billing.deals.map((d: any) => (
              <AcceptAgreement
                key={d.id}
                deal={{
                  id: d.id,
                  deal_no: d.deal_no,
                  title: d.title,
                  amount: money(Number(d.total), d.currency),
                  accepted_at: d.accepted_at ?? null,
                  accepted_name: d.accepted_name ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {!!supported.length && (
        <section className="mt-8">
          <h2 className="mono-tag mb-3">Support cover</h2>
          <div className="space-y-4">
            {supported.map((p: any) => (
              <SupportWindow key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      <section className="card mt-8 p-5 text-center sm:p-6">
        <p className="text-sm text-bone-300">
          Need assistance or want to request a revision? Reach your Nex Desk project manager at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-400 underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        {/* Sending a receipt or a signed page on WhatsApp is easier for most
            clients than digging out an email client. */}
        <a
          href={whatsappLink(CONTACT_WHATSAPP, "Hi Nex Desk — ")}
          target="_blank"
          rel="noreferrer"
          className="btn mt-4 h-10 gap-2 px-5 text-sm"
        >
          <MessageCircle className="h-4 w-4 text-lime-400" />
          Send a receipt or document on WhatsApp
        </a>
        <p className="mt-2 text-xs text-bone-300">{CONTACT_WHATSAPP}</p>
      </section>
    </>
  );
}
