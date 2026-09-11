import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { loadBilling, loadProjects } from "@/lib/portal/data";
import { money, CONTACT_EMAIL, CONTACT_WHATSAPP, whatsappLink } from "@/lib/utils";
import AcceptAgreement from "@/components/portal/AcceptAgreement";
import ReturnRequest from "@/components/portal/ReturnRequest";
import ClientPasswordForm from "@/components/portal/ClientPasswordForm";
import SupportWindow from "@/components/SupportWindow";
import { MessageCircle, User } from "lucide-react";

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

      {/* Client Profile and Billing Information */}
      <section className="card mt-8 border-ink-600 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-4">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-lime-400" />
            <div>
              <h2 className="text-base font-semibold text-bone-50">Profile & Billing Details</h2>
              <p className="text-xs text-bone-400">Your registered account and invoice information.</p>
            </div>
          </div>
          <span className="mono-tag rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[11px] font-medium text-lime-300">
            {client.lifecycle ? client.lifecycle.toUpperCase() : "ACTIVE"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Full Name</span>
            <p className="mt-1 text-sm font-medium text-bone-100">{client.name || "—"}</p>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Company</span>
            <p className="mt-1 text-sm font-medium text-bone-100">{client.company || "Individual / Direct"}</p>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Email Address</span>
            <p className="mt-1 text-sm font-medium text-bone-100 break-all">{client.email || "—"}</p>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Phone Number</span>
            <p className="mt-1 text-sm font-medium text-bone-100">{client.phone || "—"}</p>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Location</span>
            <p className="mt-1 text-sm font-medium text-bone-100">
              {[client.city, client.country].filter(Boolean).join(", ") || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Billing Currency</span>
            <p className="mt-1 text-sm font-medium text-lime-400">{client.preferred_currency || "USD"}</p>
          </div>

          <div className="sm:col-span-2 lg:col-span-2 rounded-lg border border-ink-700 bg-ink-800/40 p-3">
            <span className="mono-tag text-[10px] text-bone-400">Billing / Street Address</span>
            <p className="mt-1 text-sm font-medium text-bone-100">{client.address || "On file with contract / agreement"}</p>
          </div>

          {client.tax_id && (
            <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
              <span className="mono-tag text-[10px] text-bone-400">Tax ID / VAT</span>
              <p className="mt-1 text-sm font-medium text-bone-100">{client.tax_id}</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-bone-400">
          Need to update your billing address or company legal info? Contact your Nex Desk project manager via WhatsApp or email.
        </p>
      </section>

      {/* Change Password Self-Service */}
      <div className="mt-8">
        <ClientPasswordForm />
      </div>

      {isPaused ? (
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
              buttonLabel="Work with us again"
            />
          </div>
        </section>
      ) : (
        <section className="card mt-8 border-lime-400/25 bg-lime-400/[0.03] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <span className="mono-tag text-xs text-lime-400">Returning Project / New Feature</span>
              <h2 className="mt-1 text-lg font-semibold text-bone-50">
                Ready for your next project or milestone?
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-bone-300">
                Start a new phase, request an additional feature, or explore our other agency capabilities anytime.
              </p>
            </div>
            <ReturnRequest
              clientName={String(client.name ?? "")}
              alreadyRequested={!!client.return_requested_at}
              buttonLabel="Request New Project / Service"
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
