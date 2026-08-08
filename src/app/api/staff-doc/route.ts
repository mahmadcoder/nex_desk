import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { buildStaffOfferPdf, buildStaffPayslipPdf } from "@/lib/pdf/staffDocs";

export const maxDuration = 60;

/**
 * Staff HR documents. Streams the PDF back directly rather than returning a
 * storage URL, because these are never stored — see `staffDocs.ts`.
 *
 * Access differs BY DOCUMENT, which is the whole reason this is not one blanket
 * guard:
 *
 *  · `offer_letter` — owner/admin only. It carries someone's salary, and a
 *    staff member must not be able to fetch a colleague's by guessing an id.
 *  · `payslip` — owner/admin for anyone; a staff member for their OWN only,
 *    verified against the payment's employee_id rather than trusted from the
 *    request. Self-service is the entire point of /my-pay, but "my payslip"
 *    has to mean mine.
 */
export async function POST(req: Request) {
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { type, id } = (await req.json()) as { type: string; id: string };
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    if (type === "offer_letter") {
      if (!me.isPrivileged) {
        return NextResponse.json(
          { error: "Only an owner or admin can generate staff documents." },
          { status: 403 }
        );
      }
      return stream(await buildStaffOfferPdf(id));
    }

    if (type === "payslip") {
      const doc = await buildStaffPayslipPdf(id);

      // The ownership check happens AFTER the build because the payment row is
      // what says whose it is — there is nothing to check against beforehand.
      // 404 rather than 403: a 403 would confirm the payment exists.
      if (!me.isPrivileged && doc.employeeId !== me.employeeId) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      return stream(doc);
    }

    return NextResponse.json({ error: `Unknown staff document "${type}".` }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}

function stream(doc: { buffer: Buffer; filename: string }) {
  return new NextResponse(new Uint8Array(doc.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
    },
  });
}
