import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";

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
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
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

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error("Lead submission failed:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again, or reach us through the contact details on the site." },
      { status: 500 }
    );
  }
}
