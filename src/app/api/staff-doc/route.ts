import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { buildStaffOfferPdf } from "@/lib/pdf/staffDocs";

export const maxDuration = 60;

/**
 * Staff HR documents. Streams the PDF back directly rather than returning a
 * storage URL, because these are never stored — see `staffDocs.ts`.
 *
 * Owner/admin only. An offer letter carries someone's salary, so a staff member
 * must not be able to fetch a colleague's by guessing an id.
 */
export async function POST(req: Request) {
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!me.isPrivileged) {
    return NextResponse.json(
      { error: "Only an owner or admin can generate staff documents." },
      { status: 403 }
    );
  }

  try {
    const { type, id } = (await req.json()) as { type: string; id: string };
    if (type !== "offer_letter") {
      return NextResponse.json({ error: `Unknown staff document "${type}".` }, { status: 400 });
    }
    if (!id) return NextResponse.json({ error: "Missing employee id." }, { status: 400 });

    const doc = await buildStaffOfferPdf(id);

    return new NextResponse(new Uint8Array(doc.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}
