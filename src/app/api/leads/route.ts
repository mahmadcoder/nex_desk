import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";
import { notify } from "@/lib/actions/notify";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  service_slugs: z.array(z.string()).default([]),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  message: z.string().optional(),
  referred_by: z.string().optional(),
  // Attribution. Optional and length-capped: these come straight off a URL a
  // stranger controls, and an unbounded string from the open internet has no
  // business reaching the database.
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  landing_page: z.string().max(500).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      // Hand back which field is wrong and why, so the form can point at the
      // input instead of showing one opaque toast. Zod's own messages are
      // developer-facing ("Invalid email"), so they are mapped to plain English.
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (!key || fields[key]) continue;
        fields[key] =
          key === "email"
            ? "That doesn't look like a complete email address."
            : key === "name"
              ? "Please enter your full name."
              : issue.message;
      }
      return NextResponse.json(
        { error: "Check the highlighted fields and try again.", fields },
        { status: 400 }
      );
    }
    const { website, ...lead } = parsed.data;
    if (website) return NextResponse.json({ ok: true }); // silently drop bots

    const db = createAdminClient();
    const { data, error } = await db.from("leads").insert(lead).select().single();
    if (error) throw error;

    // Echo back what they submitted — it reassures them the form worked and
    // gives them a chance to correct anything before we quote.
    const serviceInterest = lead.service_slugs.length
      ? lead.service_slugs.map((s) => s.replace(/[-_]/g, " ")).join(", ")
      : "General enquiry";
    const budgetRange = lead.budget_range || "Not specified";
    const timeline = lead.timeline || "Not specified";

    // Raised before the emails on purpose: a new lead was the only
    // client-initiated event in the system with no in-app notification, and if
    // mail is down that is exactly when you most need the panel to tell you.
    // `notify` never throws.
    await notify({
      kind: "lead.new",
      title: `New enquiry from ${lead.name}`,
      body: [lead.company, serviceInterest, budgetRange].filter(Boolean).join(" · "),
      href: `/${process.env.ADMIN_PATH || "nx-control"}/leads`,
      entity: "leads",
      entityId: data.id,
      actorLabel: lead.name,
      actorKind: "client",
    });

    // Both sends are individually guarded. Previously a failing email threw
    // into the catch below and returned 500 to the visitor AFTER their lead was
    // already saved — so they submitted again and you got duplicates.
    try {
      await sendEmail({
      templateKey: "lead_autoreply",
      to: lead.email,
      vars: {
        client_name: lead.name.split(" ")[0],
        client_email: lead.email,
        service_interest: serviceInterest,
        budget_range: budgetRange,
        timeline,
          portal_url: `${getSiteBaseUrl()}/work`,
        },
      });
    } catch (mailErr) {
      console.error("Lead autoreply failed (lead was still saved):", mailErr);
    }

    try {
      await sendEmail({
      templateKey: "internal_new_lead",
      to: await adminNotifyAddress(),
      subjectOverride: `New lead — ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      bodyOverride:
        `A new enquiry came in through the website.\n\n` +
        `• Name: ${lead.name}\n` +
        `• Email: ${lead.email}\n` +
        (lead.phone ? `• Phone: ${lead.phone}\n` : "") +
        (lead.company ? `• Company: ${lead.company}\n` : "") +
        `• Location: ${[lead.city, lead.country].filter(Boolean).join(", ") || "—"}\n` +
        `• Wants: ${serviceInterest}\n` +
        `• Budget: ${budgetRange}\n` +
        `• Timeline: ${timeline}\n\n` +
        (lead.message ? `Their message:\n\n${lead.message}\n\n` : "") +
        `Open the Leads board to reply or convert them:\n` +
        `${getSiteBaseUrl()}/${process.env.ADMIN_PATH || "nx-control"}/leads`,
        vars: {},
      });
    } catch (mailErr) {
      console.error("Internal new-lead email failed (lead was still saved):", mailErr);
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error("Lead submission failed:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again, or reach us through the contact details on the site." },
      { status: 500 }
    );
  }
}
