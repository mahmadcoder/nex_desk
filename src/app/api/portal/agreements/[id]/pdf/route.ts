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
  if (!id) return NextResponse.json({ error: "Missing agreement ID" }, { status: 400 });

  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in to client portal" }, { status: 401 });
  }

  const db = createAdminClient();

  // Find deal directly by client_id or via a project belonging to this client
  const { data: deal } = await db
    .from("deals")
    .select("id, deal_no, title, client_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!deal) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  // Ownership verification
  let allowed = deal.client_id === session.client.id;
  if (!allowed) {
    const { data: project } = await db
      .from("projects")
      .select("id")
      .eq("deal_id", deal.id)
      .eq("client_id", session.client.id)
      .maybeSingle();
    if (project) allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized access to agreement" }, { status: 403 });
  }

  try {
    const doc = await generateDocument("agreement", deal.id);
    const filename = pdfFilename(doc.title || `Agreement-${deal.deal_no}`);

    return new Response(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Portal agreement PDF generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate agreement PDF" },
      { status: 500 }
    );
  }
}
