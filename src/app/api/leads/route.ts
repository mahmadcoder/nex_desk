import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

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

    await sendEmail({
      templateKey: "lead_autoreply",
      to: lead.email,
      vars: {
        client_name: lead.name.split(" ")[0],
        portal_url: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      },
    });

    const { data: settings } = await db.from("settings").select("email").eq("id", 1).single();
    if (settings?.email) {
      await sendEmail({
        templateKey: "internal_new_lead",
        to: settings.email,
        subjectOverride: `New lead — ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
        bodyOverride:
          `${lead.name} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}\n` +
          `${[lead.city, lead.country].filter(Boolean).join(", ")}\n\n` +
          `Wants: ${lead.service_slugs.join(", ") || "not specified"}\n` +
          `Budget: ${lead.budget_range ?? "—"}\nTimeline: ${lead.timeline ?? "—"}\n\n` +
          `${lead.message ?? ""}`,
        vars: {},
      });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Email ahmadsadiq.dev@gmail.com instead." }, { status: 500 });
  }
}
