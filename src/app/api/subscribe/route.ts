import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";
import { fmtDateTime } from "@/lib/datetime";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "invalid", error: "That doesn't look like a valid email address." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const db = createAdminClient();

    // Upsert into subscribers table
    const { data: existing } = await db.from("subscribers").select("id, is_active").eq("email", email).maybeSingle();
    
    if (existing) {
      if (!existing.is_active) {
        await db.from("subscribers").update({ is_active: true }).eq("id", existing.id);
      } else {
        // A machine-readable status, because the footer needs to render a
        // different line for this and string-matching the copy would break the
        // first time the wording changes.
        return NextResponse.json({
          ok: true,
          status: "already",
          message: "You're already subscribed with this email — nothing to do.",
        });
      }
    } else {
      await db.from("subscribers").insert({ email, source: "website_footer" });
    }

    // 1. Send Welcome Email to Client
    //
    // Guarded like the admin notice below. Unwrapped, a mail failure threw to
    // the catch at the bottom and returned 500 to a visitor whose row was
    // already saved — so they subscribed again, and again. Same bug that was
    // fixed in the leads route.
    try {
      await sendEmail({
        templateKey: "newsletter_welcome",
        to: email,
        vars: {
          client_name: email.split("@")[0],
          portal_url: getSiteBaseUrl(),
        },
      });
    } catch (welcomeErr) {
      console.error("Error sending newsletter welcome email:", welcomeErr);
    }

    // 2. Send Notification Email to Admin / Owner
    try {
      await sendEmail({
        templateKey: "internal_new_subscriber",
        to: await adminNotifyAddress(),
        subjectOverride: `New Newsletter Subscriber: ${email}`,
        bodyOverride: `Great news!\n\nA new user/client just subscribed to the Nex Desk newsletter:\n\n• Subscriber Email: ${email}\n• Subscribed At: ${fmtDateTime()}\n• Source: Website Footer / Agency Site\n\nYou can view all subscribers from your Admin Control Center (/nx-control/subscribers).`,
        vars: {},
      });
    } catch (adminEmailErr) {
      console.error("Error sending admin subscriber notice email:", adminEmailErr);
    }

    return NextResponse.json({
      ok: true,
      status: "subscribed",
      message: "You're on the list. Check your inbox for a confirmation.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { status: "error", error: "Something went wrong. Please try again in a moment." },
      { status: 500 }
    );
  }
}
