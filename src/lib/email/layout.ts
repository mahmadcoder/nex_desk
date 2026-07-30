import { getSiteBaseUrl, CONTACT_EMAIL } from "@/lib/utils";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/* Same palette as lib/pdf/theme.ts — email and documents share one look. */
const C = {
  pageBg: "#E7E3D8", // desk surface behind the sheet
  paper: "#F4F1EA", // bone — the sheet itself
  ink: "#0B0B0F",
  muted: "#75736C",
  line: "#E4E0D4",
  lime: "#D0FF4E",
  limeText: "#2A3A00",
  callout: "#F0FDF4",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const button = (url: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>` +
  `<td bgcolor="${C.lime}" style="border-radius:4px;">` +
  `<a href="${url}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:0.2px;color:${C.limeText};text-decoration:none;">${escapeHtml(label)} &rarr;</a>` +
  `</td></tr></table>`;

/**
 * Turns a bullet block into a callout card — the same lime-edged panel the
 * agreement PDF uses for its "At a glance" box.
 */
function renderBulletBlock(block: string, align: string, alignStyle: string) {
  const rows = block
    .split("\n")
    .map((line) => {
      const text = line.replace(/^\s*[•-]\s*/, "").trim();
      if (!text) return "";

      const cell = `padding:3px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.ink};${alignStyle}`;
      const url = text.match(/(https?:\/\/[^\s]+)/)?.[0];
      const colon = text.indexOf(":");
      const label = colon > -1 ? text.slice(0, colon).trim() : "";

      if (url) {
        return `<tr><td style="${cell}"><span style="color:${C.muted};">${escapeHtml(label || "Link")}:</span> ` +
          `<a href="${url}" target="_blank" style="color:${C.limeText};font-family:${MONO};font-size:12px;word-break:break-all;">${escapeHtml(url)}</a></td></tr>`;
      }

      if (label) {
        const value = text.slice(colon + 1).trim();
        return `<tr><td style="${cell}"><span style="color:${C.muted};">${escapeHtml(label)}:</span> ` +
          `<strong style="font-family:${MONO};font-size:12.5px;color:${C.ink};">${escapeHtml(value)}</strong></td></tr>`;
      }

      return `<tr><td style="${cell}"><span style="color:${C.limeText};">&bull;</span> ${escapeHtml(text)}</td></tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.callout};border-${align}:3px solid ${C.lime};margin:18px 0;">` +
    `<tr><td style="padding:14px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table>`;
}

/**
 * Wraps a plain-text email body in the Nex Desk letterhead.
 *
 * Deliberately mirrors the agreement and invoice PDFs (`lib/pdf/theme.ts`):
 * warm bone paper, dark ink, a heavy rule under the wordmark, and lime used
 * exactly once as an accent.
 *
 * Light rather than dark on purpose — dark HTML email is mangled by Gmail and
 * Outlook colour inversion, and it never matched the printed documents anyway.
 *
 * Body convention: blocks separated by blank lines. A block of `•` lines
 * becomes a callout card; a block containing a bare URL becomes a button.
 */
export function renderHtml(subject: string, body: string, lang: string = "en") {
  const isRtl = lang === "ar";
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"';
  const align = isRtl ? "right" : "left";
  const flip = isRtl ? "left" : "right";
  const alignStyle = `text-align:${align}`;
  const siteUrl = getSiteBaseUrl();

  const blocks = body
    .split("\n\n")
    .map((raw) => {
      const block = raw.trim();
      if (!block) return "";

      if (/^\s*[•-]\s/.test(block) || /\n\s*[•-]\s/.test(block)) {
        return renderBulletBlock(block, align, alignStyle);
      }

      const url = block.match(/(https?:\/\/[^\s]+)/)?.[0];
      if (url && !block.includes("<a")) {
        const before = block.replace(url, "").trim();
        const lead = before
          ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.ink};${alignStyle}">${escapeHtml(before)}</p>`
          : "";
        return lead + button(url, "Open");
      }

      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.7;color:${C.ink};white-space:pre-line;${alignStyle}">${escapeHtml(block)}</p>`;
    })
    .join("");

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html ${dirAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pageBg};padding:32px 14px;" ${dirAttr}>
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.line};" ${dirAttr}>

          <!-- Letterhead: wordmark over a heavy rule, as on the PDF header -->
          <tr>
            <td style="padding:30px 34px 16px;border-bottom:2px solid ${C.ink};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="${align}" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td valign="middle" style="padding-${flip}:9px;">
                        <!-- Logomark: lime screen block above the desk bar -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="30" style="width:30px;height:30px;background:${C.ink};border-radius:7px;">
                          <tr><td align="center" valign="middle" style="height:30px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                              <tr><td style="width:11px;height:13px;background:${C.lime};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
                              <tr><td style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
                              <tr><td style="width:17px;height:2px;background:${C.paper};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
                            </table>
                          </td></tr>
                        </table>
                      </td>
                      <td valign="middle">
                        <span style="font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:-0.4px;color:${C.ink};">Nex Desk</span>
                        <div style="font-family:${FONT};font-size:9px;color:${C.muted};margin-top:1px;">Software agency</div>
                      </td>
                    </tr></table>
                  </td>
                  <td align="${flip}" valign="middle">
                    <span style="font-family:${MONO};font-size:8px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">${escapeHtml(today)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:30px 34px 8px;${alignStyle}">
              <h1 style="margin:0 0 22px;font-family:${FONT};font-size:21px;font-weight:600;letter-spacing:-0.5px;line-height:1.3;color:${C.ink};">${escapeHtml(subject)}</h1>
              ${blocks}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 34px 26px;">
              <div style="border-top:1px solid ${C.line};padding-top:14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="${align}" style="font-family:${FONT};font-size:11px;line-height:1.6;color:${C.muted};">
                      Nex Desk Software Agency &middot; Multan, Pakistan<br>
                      <a href="mailto:${CONTACT_EMAIL}" style="color:${C.muted};">${CONTACT_EMAIL}</a>
                    </td>
                    <td align="${flip}" valign="top">
                      <a href="${siteUrl}" target="_blank" style="font-family:${FONT};font-size:11px;font-weight:600;color:${C.ink};text-decoration:none;border-bottom:1.5px solid ${C.lime};">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

        </table>

        <p style="max-width:600px;margin:12px auto 0;font-family:${FONT};font-size:10px;color:${C.muted};text-align:center;">
          &copy; ${new Date().getFullYear()} Nex Desk Software Agency
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
