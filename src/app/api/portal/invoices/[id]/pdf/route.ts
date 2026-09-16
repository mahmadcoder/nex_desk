import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import { createAdminClient } from "@/lib/supabase/server";
import { generateDocument } from "@/lib/pdf/generate";
import { pdfFilename } from "@/lib/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in to client portal" }, { status: 401 });
  }

  if (!session.perms.show_invoices) {
    return NextResponse.json({ error: "Invoices not enabled for this account" }, { status: 403 });
  }

  const db = createAdminClient();

  // Scope strictly to this client's own invoices
  const { data: invoice } = await db
    .from("invoices")
    .select("id, invoice_no, client_id, status")
    .eq("id", id)
    .eq("client_id", session.client.id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Drafts are scheduled future stages not yet billed
  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Invoice has not been issued yet" }, { status: 400 });
  }

  try {
    const doc = await generateDocument("invoice", invoice.id);
    const filename = pdfFilename(doc.title || `Invoice-${invoice.invoice_no}`);

    return new Response(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Portal invoice PDF generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}
