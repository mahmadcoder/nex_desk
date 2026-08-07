import { ImageResponse } from "next/og";

/**
 * The card people actually see when a Nex Desk link is pasted somewhere.
 *
 * `app/layout.tsx` declared `openGraph` with no `images` key and there was no
 * `opengraph-image` file anywhere, so every link shared to WhatsApp, LinkedIn
 * or Slack rendered as a bare text stub — on a site whose main contact route is
 * a WhatsApp float.
 *
 * The design lives here once and the route files are three lines each.
 * Deliberately no custom font: `next/og` ships a default, and fetching a font
 * at build time is a build-time failure waiting to happen the first time
 * Fontshare is slow.
 */

/** Both exports are the Next.js file conventions; re-export them per route. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same values as globals.css. Hardcoded because Satori resolves no CSS
// variables — it only ever sees the inline styles below.
const INK_950 = "#0B0D0C";
const INK_700 = "#2A2F2C";
const LIME_400 = "#A3E635";
const BONE_50 = "#F7F6F3";
const BONE_400 = "#8B908C";

export function ogCard({
  title,
  eyebrow = "Nex Desk",
  footnote,
}: {
  title: string;
  /** Small label above the title — the section, or the service category. */
  eyebrow?: string;
  /** Optional right-aligned detail, e.g. "from $6,000 · 4–8 weeks". */
  footnote?: string | null;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK_950,
          padding: "72px 80px",
          // Satori has no `border` shorthand support worth relying on; an inset
          // shadow is the dependable way to get the hairline frame.
          boxShadow: `inset 0 0 0 1px ${INK_700}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: LIME_400 }} />
          <div
            style={{
              fontSize: 24,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: BONE_400,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 62 : 82,
            lineHeight: 1.05,
            color: BONE_50,
            letterSpacing: -2,
            // Satori does not implement line-clamp, so an unbounded title would
            // simply run off the canvas. Cut it here instead.
            maxHeight: 340,
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${INK_700}`,
            paddingTop: 28,
            fontSize: 26,
            color: BONE_400,
          }}
        >
          <div style={{ display: "flex" }}>Multan, Pakistan — working worldwide</div>
          {footnote ? (
            <div style={{ display: "flex", color: LIME_400 }}>{footnote}</div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      </div>
    ),
    size
  );
}
