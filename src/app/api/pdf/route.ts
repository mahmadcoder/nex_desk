import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDocument, type DocType } from "@/lib/pdf/generate";

export const maxDuration = 60;

/** POST { type, id } → generates the PDF and returns a signed download URL. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["owner", "admin", "staff"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const { type, id } = (await req.json()) as { type: DocType; id: string };
    const doc = await generateDocument(type, id, user.id);
    return NextResponse.json({ ok: true, url: doc.url, title: doc.title });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}
