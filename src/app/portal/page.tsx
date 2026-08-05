import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { money, moneyMulti, sumByCurrency, pdfFilename, externalUrl, daysUntil, CONTACT_EMAIL, CONTACT_WHATSAPP, whatsappLink } from "@/lib/utils";
import { Badge, Stat } from "@/components/admin/ui";
import { ExternalLink, CheckCircle, Circle, DollarSign, Calendar, FileText, Download, MessageCircle, Receipt } from "lucide-react";
import { expenseCategoryLabel } from "@/config/expenseCategories";
import { contractPosition, extrasPosition, mergeTotals, invoiceOriginLabel } from "@/lib/billing";
import ClientDocumentUploader from "@/components/portal/ClientDocumentUploader";
import ClientPortalSignOutButton from "@/components/portal/ClientPortalSignOutButton";
import ClientChangeRequest from "@/components/portal/ClientChangeRequest";
import AcceptAgreement from "@/components/portal/AcceptAgreement";
import ApproveMilestone from "@/components/portal/ApproveMilestone";
import KickoffChecklist from "@/components/portal/KickoffChecklist";
import ReturnRequest from "@/components/portal/ReturnRequest";
import SupportWindow from "@/components/SupportWindow";
import { describeMetrics } from "@/config/logFields";

export const dynamic = "force-dynamic";

export default async function Portal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("*").eq("email", user.email!).maybeSingle();

  if (!client) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center mt-12">
        <h1 className="text-2xl font-semibold">No project profile found</h1>
        <p className="mt-3 text-sm text-bone-300">
          Your account ({user.email}) is not currently attached to an active client profile. If you believe this is an error, please reach out to your Nex Desk representative.
        </p>
        <Link href="/" className="btn mt-6 inline-flex">Return to Homepage</Link>
      </div>
    );
  }

  // A paused account keeps its portal — every invoice and document a client
  // may need years later stays reachable — but goes read-only. Uploading and
  // raising new work are replaced by one button to ask us to pick things back
  // up. The same rule is enforced server-side in raiseChangeRequest; hiding a
  // form is not a control.
  const isPaused = String(client.lifecycle ?? "active") !== "active";

  const perms = {
    show_financials: true,
    show_invoices: true,
    show_milestones: true,
    show_files: true,
    show_staging: true,
    ...(client.client_permissions as Record<string, boolean> || {}),
  };

  const [{ data: projects }, { data: invoices }, { data: docs }, { data: assignedAssignments }, { data: deals }] =
    await Promise.all([
      db.from("projects").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      db.from("invoices").select("*").eq("client_id", client.id).order("issue_date", { ascending: false }),
      db.from("documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      db.from("client_employee_assignments").select("*, employees(id, full_name, email, job_title, seniority, avatar_url, skills)").eq("client_id", client.id),
      // The signed agreements. Without these the portal could only ever show
      // what had been invoiced so far, so a 1500 deal billed 50/50 read as a
      // 750 contract.
      db.from("deals").select("id, deal_no, title, total, currency, accepted_at, accepted_name").eq("client_id", client.id).eq("status", "locked"),
    ]);

  // Costs paid on their behalf. Only the ones marked visible — an internal
  // note about a tool the agency absorbed is not the client's business.
  //
  // Read separately rather than in the Promise.all above so that a missing
  // 2027-06 migration degrades to "no extras shown" instead of taking the
  // whole portal down with a destructuring error.
  const { data: expenseRows, error: expensesError } = await db
    .from("project_expenses")
    .select("id, category, label, vendor, details, bill_amount, currency, incurred_on, renews_on, receipt_url")
    .eq("client_id", client.id)
    .eq("visible_to_client", true)
    .order("incurred_on", { ascending: false });

  if (expensesError) {
    console.error("Portal: could not load expenses", expensesError);
  }
  const visibleExpenses = expenseRows ?? [];

  const assignedTeam = Array.from(
    new Map(
      (assignedAssignments ?? []).map((a) => a.employees).filter(Boolean).map((e: any) => [e.id, e])
    ).values()
  );

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      try {
        // `download` names the saved file after the document, not after its
        // storage key.
        const { data } = await db.storage
          .from("documents")
          .createSignedUrl(d.storage_path, 3600, { download: pdfFilename(d.title) });
        return { ...d, url: data?.signedUrl };
      } catch {
        return { ...d, url: null };
      }
    })
  );

  const projectIds = (projects ?? []).map((p) => p.id);

  // What the client has already asked for, so the portal can show them where
  // each request stands instead of leaving them to chase it.
  const { data: myChangeRequests } = projectIds.length
    ? await db.from("change_requests")
        .select("id, project_id, title, status")
        .in("project_id", projectIds)
        .in("status", ["requested", "quoted", "invoiced"])
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  // The query above is deliberately filtered to OPEN requests for the
  // client-facing list. Contract value needs the AGREED ones, which is a
  // different set — so it is read separately rather than reusing that one.
  const { data: agreedChanges } = projectIds.length
    ? await db.from("change_requests")
        .select("id, status, quoted_amount, currency, invoice_id")
        .in("project_id", projectIds)
    : { data: [] as any[] };

  const [{ data: milestones }, { data: sharedLogs }] = projectIds.length
    ? await Promise.all([
        db.from("milestones").select("*").in("project_id", projectIds).order("sort_order"),
        // Only logs explicitly shared by the team. `blockers` is deliberately
        // not selected — that conversation stays internal.
        db.from("daily_work_logs")
          .select("id, project_id, work_date, tasks_completed, employee_name, metrics")
          .in("project_id", projectIds)
          .eq("client_visible", true)
          .order("work_date", { ascending: false })
          .limit(40),
      ])
    : [{ data: [] }, { data: [] }];

  const updates = sharedLogs ?? [];

  // Second route to the agreement, via the project's own `deal_id`. A deal
  // whose `client_id` points at a stale duplicate client row would otherwise
  // leave the portal showing no contract value at all.
  const dealIdsViaProjects = (projects ?? []).map((p) => p.deal_id).filter(Boolean) as string[];
  const { data: dealsViaProjects } = dealIdsViaProjects.length
    ? await db.from("deals").select("deal_no, total, currency, status").in("id", dealIdsViaProjects)
    : { data: [] as any[] };

  const lockedDeals = Array.from(
    new Map(
      [...(deals ?? []), ...(dealsViaProjects ?? []).filter((d: any) => d.status === "locked")]
        .map((d: any) => [d.deal_no, d])
    ).values()
  );

  // Totals are grouped by each currency of its own. Previously they were summed
  // together and then labelled with `preferred_currency`, so a client billed in
  // USD saw their figures marked "Rs".
  //
  // A draft is a scheduled payment stage that has not been issued yet — the
  // client must not see it at all, so it is filtered out before anything else.
  const invoiceRows = (invoices ?? []).filter((i) => i.status !== "draft");

  // Contract money and additional items are counted apart.
  //
  // This screen used to subtract EVERY payment from the agreed contract total,
  // so a client who paid for a domain was shown a smaller balance on their
  // agreement than they actually owed. Wrong on our side is bad; wrong on the
  // client's own screen is worse.
  const contractPos = contractPosition(
    lockedDeals.map((d: any) => ({ ...d, status: "locked" })),
    invoiceRows,
    agreedChanges ?? []
  );
  const extrasPos = extrasPosition(invoiceRows, agreedChanges ?? []);

  const contractValue = contractPos.contracted;
  const totalPaid = mergeTotals(contractPos.paid, extrasPos.paid);

  // What is still owed on the agreement specifically — not on any extra.
  const balanceOwed = contractPos.outstanding;
  // Everything owed, of every kind. "What do I owe you in total" is a fair
  // question and merging per currency is safe.
  const totalOwed = mergeTotals(contractPos.outstanding, extrasPos.outstanding);

  const hasBilling = contractValue.length > 0 || invoiceRows.length > 0;

  const billedCurrencies = [
    ...new Set([
      ...contractValue.map((c) => c.currency),
      ...invoiceRows.map((i) => String(i.currency).toUpperCase()),
    ]),
  ];

  // No px-4 below: the portal layout wraps this in .shell, which already
  // applies a clamp() gutter. The two together gave away 36px each side of a
  // 390px screen.
  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          {/* The global h1-h4 rule sets a very tight line-height, so a heading
              directly under an eyebrow rides up into it. mt-2 + leading-tight
              gives the pair room without loosening the heading itself. */}
          <p className="mono-tag text-lime-400">Nex Desk Client Portal</p>
          {/* "Welcome" the first time, "Welcome back" every time after — a
              greeting that never changes stops reading as a greeting. */}
          <h1 className="mt-2 text-3xl leading-tight font-semibold text-bone-50">
            {Number(client.portal_login_count ?? 0) > 1 ? "Welcome back" : "Welcome"},{" "}
            {String(client.name || "").trim().split(/\s+/)[0] || client.name}.
          </h1>
          <p className="mt-2 text-sm text-bone-300">
            {client.company ? `${client.company} · ` : ""}
            {Number(client.portal_login_count ?? 0) > 1
              ? "Here is where everything stands right now."
              : "Everything about your project lives here — progress, invoices and documents."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!!billedCurrencies.length && (
            <span className="mono-tag inline-flex items-center gap-1.5 rounded-full border border-ink-500 bg-ink-800 px-3.5 py-2 text-xs leading-none text-bone-200">
              Billed in <strong className="font-semibold text-lime-400">{billedCurrencies.join(", ")}</strong>
            </span>
          )}
          <ClientPortalSignOutButton />
        </div>
      </div>

      {/* A paused account. Said plainly and without blame — a dormant client is
          a past client, not a problem account, and this page is very often the
          last thing they see of us. Everything below stays readable. */}
      {isPaused && (
        <section className="mt-8 card border-lime-400/25 bg-lime-400/[0.04] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-xl">
              <span className="mono-tag text-xs text-lime-400">Account paused</span>
              <h2 className="mt-2 text-lg font-semibold text-bone-50">
                We are not working on anything for you right now.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-bone-300">
                Everything from our work together stays here — invoices, receipts, documents and
                the full history — and it is yours to download at any time. New requests and
                uploads are switched off while things are paused. Whenever you want to start
                something again, tell us here and we will pick it straight back up.
              </p>
            </div>
            <ReturnRequest
              clientName={String(client.name ?? "")}
              alreadyRequested={!!client.return_requested_at}
            />
          </div>
        </section>
      )}

      {/* Agreements waiting on the client. Accepting here replaces print,
          sign, scan and upload — three chances to lose momentum. */}
      {!!(deals ?? []).length && (
        <section className="mt-8 space-y-2.5">
          {(deals ?? []).map((d: any) => (
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
        </section>
      )}

      {/* Financial Summary Cards */}
      {perms.show_financials && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <span className="text-xs text-bone-300 block mono-tag mb-1">Contract Value</span>
            <p className="text-2xl font-mono text-bone-50">{moneyMulti(contractValue, "—")}</p>
            <p className="mt-1 text-[11px] text-bone-300">Agreed total across your signed agreements</p>
          </div>
          <div className="card p-5 border-lime-500/30">
            <span className="text-xs text-lime-400 block mono-tag mb-1">Total Amount Paid</span>
            <p className="text-2xl font-mono text-lime-400">{moneyMulti(totalPaid, "—")}</p>
            <p className="mt-1 text-[11px] text-bone-300">
              Across your agreements and any additional items
            </p>
          </div>
          <div className="card p-5">
            <span className="text-xs text-bone-300 block mono-tag mb-1">Balance On Contract</span>
            <p className={`text-2xl font-mono ${balanceOwed.length ? "text-amber-400" : "text-bone-200"}`}>
              {balanceOwed.length ? moneyMulti(balanceOwed) : hasBilling ? "Settled in full" : "—"}
            </p>
            <p className="mt-1 text-[11px] text-bone-300">
              {contractValue.length ? "Against your signed agreement" : "Against the invoices issued"}
            </p>
          </div>
          {/* Kept apart from the contract on purpose. Change requests, renewals
              and costs we paid on their behalf are their own agreements, and
              folding them into the contract balance is what made this screen
              understate what was owed. */}
          <div className="card p-5">
            <span className="text-xs text-bone-300 block mono-tag mb-1">Additional Items</span>
            <p
              className={`text-2xl font-mono ${
                extrasPos.outstanding.length ? "text-amber-400" : "text-bone-200"
              }`}
            >
              {extrasPos.outstanding.length
                ? moneyMulti(extrasPos.outstanding)
                : extrasPos.billed.length
                  ? "Nothing outstanding"
                  : "—"}
            </p>
            <p className="mt-1 text-[11px] text-bone-300">
              {extrasPos.billed.length
                ? `${moneyMulti(extrasPos.billed)} billed for change requests, renewals and costs paid on your behalf`
                : "Anything billed outside your agreement appears here"}
            </p>
          </div>
        </section>
      )}

      {/* Assigned Dedicated Team */}
      {!!assignedTeam.length && (
        <section className="mt-8 card p-6 border-ink-600 bg-ink-900/60">
          <div className="border-b border-ink-600 pb-4 mb-5">
            {/* The eyebrow was inline with no margin, so the heading sat flush
                against it — the global heading line-height closed the last gap. */}
            <span className="mono-tag block text-xs text-lime-400">Assigned Agency Team</span>
            <h2 className="mt-2 text-lg leading-tight font-medium text-bone-50">Your Dedicated Agency Specialists</h2>
            <p className="mt-1.5 text-xs text-bone-300">The team members assigned directly to manage and deliver your projects.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignedTeam.map((emp: any) => (
              <div key={emp.id} className="card p-4 bg-ink-800/80 border-ink-700 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-lime-400/30 bg-ink-700 shrink-0">
                  {emp.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm font-semibold text-lime-400 bg-lime-400/10">
                      {emp.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* min-w-0 + truncate: a long job title used to stretch the
                    card and break the grid on a phone. */}
                <div className="min-w-0">
                  <h3 className="truncate text-sm leading-snug font-semibold text-bone-50">{emp.full_name}</h3>
                  <p className="mt-0.5 truncate text-xs text-lime-400 font-medium">{emp.job_title}</p>
                  <span className="mono-tag mt-1 block text-[11px] text-bone-300">{emp.seniority}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects & Milestones Section */}
      {(projects ?? []).map((p) => {
        const ms = (milestones ?? []).filter((m) => m.project_id === p.id);
        const timeline = updates.filter((u) => u.project_id === p.id);
        return (
          <section key={p.id} className="card mt-8 p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-600 pb-5">
              <div>
                <span className="mono-tag block text-xs text-lime-400">Active Project</span>
                <h2 className="mt-2 text-2xl leading-tight font-semibold text-bone-50">{p.name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-bone-300">
                  {p.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Started: {new Date(p.start_date).toLocaleDateString("en-GB")}
                    </span>
                  )}
                  {p.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-lime-400" /> Target Delivery: {new Date(p.deadline).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>
              <Badge>{p.status}</Badge>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="mono-tag text-xs">Project Progress</span>
                <span className="font-mono text-lime-400">{p.progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-2.5 rounded-full bg-lime-400 transition-[width] duration-700"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>

            {/* Where the free-fix period stands. Sits directly above the
                change-request form on purpose — this is the line between a bug
                we owe them and new work we quote for. */}
            <SupportWindow project={p} />

            {/* What the team actually did, newest first */}
            {!!timeline.length && (
              <div className="mt-8">
                <h3 className="mono-tag mb-3 text-xs font-semibold text-bone-200">Recent Updates</h3>
                <ol className="space-y-0">
                  {timeline.map((u, i) => (
                    <li key={u.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {/* connector line */}
                      {i < timeline.length - 1 && (
                        <span className="absolute left-[5px] top-4 bottom-0 w-px bg-ink-600" aria-hidden />
                      )}
                      <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-lime-400" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="mono-tag text-[11px] text-lime-400">
                            {new Date(u.work_date).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </span>
                          {u.employee_name && (
                            <span className="text-[11px] text-bone-300">{u.employee_name}</span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-bone-200">
                          {u.tasks_completed}
                        </p>
                        {/* Concrete numbers beat "worked on SEO" every time. */}
                        {!!describeMetrics(u.metrics).length && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {describeMetrics(u.metrics).map((m) => (
                              <span key={m.label} className="mono-tag text-[11px]">
                                {m.label}: <strong className="text-bone-100">{m.value}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Milestones */}
            {perms.show_milestones && !!ms.length && (
              <div className="mt-8">
                <h3 className="mono-tag mb-3 text-xs font-semibold text-bone-200">Project Milestones</h3>
                <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600 bg-ink-900/40">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        {m.is_done ? (
                          <CheckCircle className="h-4 w-4 text-lime-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-bone-300 shrink-0" />
                        )}
                        <span className={m.is_done ? "text-bone-300 line-through" : "text-bone-100"}>
                          {m.title}
                        </span>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        {m.due_date && !m.is_done && (
                          <span className="mono-tag text-xs text-bone-300">{m.due_date}</span>
                        )}
                        {/* Sign-off becomes a recorded click, not a WhatsApp
                            message. Only offered once the team marks it done. */}
                        {m.is_done && (
                          <ApproveMilestone milestoneId={m.id} approvedAt={m.approved_at ?? null} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Links to the actual site. The live URL was stored and editable
                in the admin panel but never rendered here, so a client whose
                site had gone live had no link to it. */}
            {/* Normalised: a bare "client.com" is a relative path to the
                browser and resolved against OUR domain. */}
            {perms.show_staging && (externalUrl(p.staging_url) || externalUrl(p.live_url)) && (
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {externalUrl(p.staging_url) && (
                  <a
                    href={externalUrl(p.staging_url)!}
                    target="_blank"
                    rel="noreferrer"
                    className={`btn h-10 gap-2 px-5 text-sm ${p.live_url ? "" : "btn-primary"}`}
                  >
                    Staging preview <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {externalUrl(p.live_url) && (
                  <a
                    href={externalUrl(p.live_url)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary h-10 gap-2 px-5 text-sm"
                  >
                    Visit your live site <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {Array.isArray(p.kickoff_items) && p.kickoff_items.length > 0 && (
              <KickoffChecklist projectId={p.id} items={p.kickoff_items} />
            )}

            {!isPaused && (
              <ClientChangeRequest
                projectId={p.id}
                projectName={p.name}
                openRequests={(myChangeRequests ?? []).filter((c) => c.project_id === p.id)}
              />
            )}
          </section>
        );
      })}

      {/* What we bought on their behalf, with the receipt for each. Shown
          whenever there is anything to show, so a charge on an invoice can
          always be traced back to a document without having to ask us. */}
      {!!visibleExpenses.length && (
        <section className="card mt-8 p-6">
          <div className="border-b border-ink-600 pb-4">
            <h2 className="flex items-center gap-2 text-lg leading-tight font-medium text-bone-50">
              <Receipt className="h-4 w-4 text-lime-400" /> Paid on your behalf
            </h2>
            <p className="mt-1.5 text-xs text-bone-300">
              Domains, hosting, licences and anything else we bought for you outside the
              agreed fee. Every receipt is here.
            </p>
          </div>

          <ul className="mt-4 divide-y divide-ink-600">
            {visibleExpenses.map((x) => {
              const renewsIn = daysUntil(x.renews_on);

              return (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="mono-tag text-[10px] text-lime-300">
                      {expenseCategoryLabel(x.category)}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-100">{x.label}</p>
                    <p className="mt-0.5 text-xs text-bone-300">
                      {x.vendor ? `${x.vendor} · ` : ""}
                      {x.incurred_on}
                      {renewsIn !== null && renewsIn >= 0 && (
                        <span className={renewsIn <= 30 ? "text-amber-400" : ""}>
                          {" "}· renews {x.renews_on}
                        </span>
                      )}
                    </p>
                    {x.details && (
                      <p className="mt-1 text-xs leading-relaxed text-bone-300">{x.details}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {/* Zero is not "free of charge by accident" — say so. */}
                    <span className="font-mono text-sm text-bone-100">
                      {Number(x.bill_amount) > 0
                        ? money(Number(x.bill_amount), x.currency)
                        : "Covered by us"}
                    </span>
                    {x.receipt_url && (
                      <a
                        href={x.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-lime-400 hover:underline"
                      >
                        <FileText className="h-3 w-3" /> Receipt
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Invoices & Documents Section */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {perms.show_invoices && (
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-ink-600 pb-4">
              <h2 className="flex items-center gap-2 text-lg leading-tight font-medium text-bone-50">
                <DollarSign className="h-4 w-4 text-lime-400" /> Invoices & Receipts
              </h2>
              {!!totalOwed.length && (
                <span className="mono-tag text-amber-400 text-xs">{moneyMulti(totalOwed)} due</span>
              )}
            </div>

            {/* min-w-0 + shrink-0 on the rows below, the same shape as the
                documents list. Without them a long multi-currency
                "Paid … / Total …" refuses to shrink and pushes the status badge
                off the edge of the card. */}
            <ul className="mt-4 divide-y divide-ink-600">
              {invoiceRows.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-bone-100">
                      {i.invoice_no}
                      {/* So a client can tell a payment stage from a domain
                          re-bill without having to ask us. */}
                      {invoiceOriginLabel(i) && (
                        <span className="mono-tag rounded-full border border-ink-500 px-1.5 py-0.5 text-[9px] leading-none text-bone-300">
                          {invoiceOriginLabel(i)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-bone-300">
                      Paid: {money(Number(i.amount_paid), i.currency)} / Total: {money(Number(i.total), i.currency)}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <Badge>{i.status}</Badge>
                  </span>
                </li>
              ))}
              {!invoiceRows.length && (
                <li className="py-6 text-center text-sm text-bone-300">No invoices issued yet.</li>
              )}
            </ul>
          </section>
        )}

        {perms.show_files && (
          <div className="space-y-6">
            {!isPaused && <ClientDocumentUploader clientId={client.id} />}

            <section className="card p-5 sm:p-6">
              <div className="border-b border-ink-600 pb-4">
                <h2 className="flex items-center gap-2 text-lg leading-tight font-medium text-bone-50">
                  <FileText className="h-4 w-4 text-lime-400" /> Shared Documents & PDF Assets
                </h2>
              </div>

              <ul className="mt-4 divide-y divide-ink-600">
                {withUrls.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-bone-100 font-medium">{d.title}</p>
                        {d.uploaded_by_client && (
                          <span className="mono-tag shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[11px] leading-none text-emerald-300">
                            Client Signed
                          </span>
                        )}
                      </div>
                      <p className="mono-tag text-xs text-bone-300">{new Date(d.created_at).toLocaleDateString("en-GB")}</p>
                    </div>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mono-tag flex items-center gap-1 text-lime-400 hover:underline shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </a>
                    )}
                  </li>
                ))}
                {!withUrls.length && (
                  <li className="py-6 text-center text-sm text-bone-300">No documents uploaded yet.</li>
                )}
              </ul>
            </section>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-3 text-center text-xs text-bone-300">
        <p>
          Need assistance or want to request a revision? Reach your Nex Desk project manager at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-400 underline">{CONTACT_EMAIL}</a>
        </p>
        {/* Sending a receipt or a signed page on WhatsApp is easier for most
            clients than digging out an email client. */}
        <a
          href={whatsappLink(CONTACT_WHATSAPP, "Hi Nex Desk — ")}
          target="_blank"
          rel="noreferrer"
          className="btn h-10 gap-2 px-5 text-sm"
        >
          <MessageCircle className="h-4 w-4 text-lime-400" />
          Send a receipt or document on WhatsApp
        </a>
        <p className="text-bone-300">{CONTACT_WHATSAPP}</p>
      </div>
    </div>
  );
}
