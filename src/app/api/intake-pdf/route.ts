import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getCurrentStaff } from "@/lib/auth/staff";
import { getAgency } from "@/lib/agency";
import { getSiteBaseUrl } from "@/lib/utils";
import { setDocAgency } from "@/lib/pdf/parts";
import { IntakeRequestDoc } from "@/lib/pdf/documents";

export const maxDuration = 60;

/**
 * The "what we need from you" checklist.
 *
 * Streamed straight back and never stored, unlike everything in
 * `generateDocument`. It prints a live onboarding link, and a live link sitting
 * in the documents table behind a 30-day signed URL is a wider blast radius
 * than a checklist warrants.
 *
 * Owner/admin only — the URL in the body is a working token, so this must not
 * be a way for a staff member to mint one.
 */
export async function POST(req: Request) {
  const me = await getCurrentStaff();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!me.isPrivileged) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      kind?: string;
      token?: string | null;
      recipient?: string | null;
    };

    const kind = body.kind === "staff" ? "staff" : "client";

    // A token, never a URL. The address is built here from our own base URL, so
    // a caller cannot get an arbitrary link printed onto agency letterhead —
    // which would be a phishing document with our logo at the top of it.
    const token = /^[0-9a-f-]{36}$/i.test(String(body.token ?? "")) ? body.token : null;
    const url = token ? `${getSiteBaseUrl()}/intake/${token}` : null;

    setDocAgency(await getAgency());

    const element = createElement(IntakeRequestDoc, {
      kind,
      url,
      recipient: body.recipient?.slice(0, 120) || null,
    });
    // Same cast the other renderers use: @react-pdf types `renderToBuffer`
    // against DocumentProps, which a component returning a <Document> does not
    // structurally satisfy.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);

    const filename = `${kind === "client" ? "Client" : "Team"}-details-request.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't build that document" },
      { status: 500 }
    );
  }
}
