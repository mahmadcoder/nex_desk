import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { AgencyTemplatePdfDocument } from "@/lib/pdf/documents";

export async function POST(req: NextRequest) {
  try {
    const { title, badge, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }

    const element = createElement(AgencyTemplatePdfDocument, { title, badge, content });
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
