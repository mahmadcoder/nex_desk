import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Clients sign in with a one-time link, no password. We only send a link if
 * the email matches a real client record — otherwise we return the same
 * success response so nobody can use this to check who our clients are.
 */
export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Enter your email" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: client } = await db.from("clients")
    .select("id, name").eq("email", email.toLowerCase().trim()).maybeSingle();

  if (client) {
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/auth`,
        data: { full_name: client.name },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
