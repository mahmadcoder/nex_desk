import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const db = createAdminClient();

    // Upsert into subscribers table
    const { data: existing } = await db.from("subscribers").select("id, is_active").eq("email", email).maybeSingle();
    
    if (existing) {
      if (!existing.is_active) {
        await db.from("subscribers").update({ is_active: true }).eq("id", existing.id);
      } else {
        return NextResponse.json({ ok: true, message: "You're already subscribed! Thank you." });
      }
    } else {
      await db.from("subscribers").insert({ email, source: "website_footer" });
    }

    // 1. Send Welcome Email to Client
    await sendEmail({
      templateKey: "newsletter_welcome",
      to: email,
      vars: {
        client_name: email.split("@")[0],
        portal_url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nexdesk.agency",
      },
    });

    // 2. Send Notification Email to Admin / Owner
    const { data: settings } = await db.from("settings").select("email").eq("id", 1).maybeSingle();
    const adminEmail = settings?.email || process.env.GMAIL_USER || "ahmadsadiq.dev@gmail.com";

    try {
      await sendEmail({
        templateKey: "internal_new_subscriber",
        to: adminEmail,
        subjectOverride: `New Newsletter Subscriber: ${email}`,
        bodyOverride: `Great news!\n\nA new user/client just subscribed to the Nex Desk newsletter:\n\n• Subscriber Email: ${email}\n• Subscribed At: ${new Date().toLocaleString()}\n• Source: Website Footer / Agency Site\n\nYou can view all subscribers from your Admin Control Center (/nx-control/subscribers).`,
        vars: {},
      });
    } catch (adminEmailErr) {
      console.error("Error sending admin subscriber notice email:", adminEmailErr);
    }

    return NextResponse.json({ ok: true, message: "Thank you for subscribing! Check your inbox for confirmation." });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}
