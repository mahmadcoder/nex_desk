import { NextResponse } from "next/server";
import { requireStaffRequest } from "@/lib/auth/staff";
import { generateDocument, type DocType } from "@/lib/pdf/generate";

export const maxDuration = 60;

/** POST { type, id } → generates the PDF and returns a signed download URL. */
export async function POST(req: Request) {
  const auth = await requireStaffRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { type, id } = (await req.json()) as { type: DocType; id: string };
    const doc = await generateDocument(type, id, auth.userId);
    return NextResponse.json({ ok: true, url: doc.url, title: doc.title });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}
