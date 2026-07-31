import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { generateDocument, type DocType } from "@/lib/pdf/generate";

export const maxDuration = 60;

/**
 * Document types an employee may generate.
 *
 * Everything else exposes commercial detail — prices, contract value, bank
 * details, handover credentials — so it is owner/admin only. Hiding the button
 * is not enough: this endpoint is directly callable.
 */
const STAFF_ALLOWED_DOCS: DocType[] = ["progress_report"];

/** POST { type, id } → generates the PDF and returns a signed download URL. */
export async function POST(req: Request) {
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { type, id } = (await req.json()) as { type: DocType; id: string };

    if (!me.isPrivileged && !STAFF_ALLOWED_DOCS.includes(type)) {
      return NextResponse.json(
        { error: "Only an owner or admin can generate that document." },
        { status: 403 }
      );
    }

    const doc = await generateDocument(type, id, me.userId);
    return NextResponse.json({ ok: true, url: doc.url, title: doc.title });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}
