import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAgency } from "@/lib/agency";
import { setDocAgency } from "@/lib/pdf/parts";
import { createElement } from "react";
import { AgencyTemplatePdfDocument } from "@/lib/pdf/documents";
import { getCurrentStaff } from "@/lib/auth/staff";

export async function POST(req: NextRequest) {
  // Renders caller-supplied text straight into a PDF, and the agency template
  // library holds contracts and commercial terms — owner/admin only.
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!me.isPrivileged) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const { title, badge, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }

    const element = createElement(AgencyTemplatePdfDocument, { title, badge, content });
    setDocAgency(await getAgency());
    const buffer = await renderToBuffer(element as any);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation failed:", err);
    return NextResponse.json({ error: err?.message || "Failed to generate PDF" }, { status: 500 });
  }
}
