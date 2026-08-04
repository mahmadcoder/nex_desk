import { StyleSheet, Font } from "@react-pdf/renderer";

/**
 * Three weights, not two.
 *
 * Only 400 and 500 were registered, so every heading in every document was
 * Inter Medium — barely distinguishable from the body beneath it. Anything
 * asking for a heavier weight silently fell back to 500. Registering 600 is
 * what actually lets a heading look like a heading.
 *
 * Note these are fetched over the network at render time. If the CDN is slow
 * or unreachable, react-pdf falls back to Helvetica, whose narrower metrics
 * make everything look smaller again — self-hosting the files is the proper
 * fix and is worth doing separately.
 */
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-500-normal.woff", fontWeight: 500 },
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-600-normal.woff", fontWeight: 600 },
  ],
});

export const C = {
  ink: "#0B0B0F",
  ink700: "#252530",
  bone: "#F4F1EA",
  lime: "#D0FF4E",
  limeText: "#2A3A00",
  line: "#E4E0D4",
  // Was #75736C, which is 4.26:1 against the bone page — below the 4.5:1
  // minimum for readable text, and it was carrying whole pages of terms.
  // This is ~6.3:1 and still clearly secondary.
  muted: "#5A584F",
  // Both of these previously failed contrast at small sizes too.
  ok: "#137A57",
  warn: "#8F5810",
};

/**
 * Documents print on bone, not white — same warm paper the brand uses on screen.
 *
 * Sizes were raised across the board after the offer letter proved unreadable:
 * body was 9.5 pt, and the entire terms section — six legal clauses — was 8 pt
 * grey. For print, 10–11 pt body is the floor, and legal text people are
 * expected to actually read should not be the smallest thing on the page.
 */
export const s = StyleSheet.create({
  page: { backgroundColor: "#F4F1EA", padding: 52, fontFamily: "Inter", fontSize: 10.5, color: C.ink, lineHeight: 1.6 },

  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottomWidth: 1.5, borderBottomColor: C.ink },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 16, fontWeight: 600, letterSpacing: -0.4 },
  docType: { fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: C.muted },
  docNo: { fontSize: 18, fontWeight: 600, letterSpacing: -0.5, marginTop: 3 },

  h1: { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, marginBottom: 8 },
  // 13.5 against a 10.5 body is a clear step; 11 against 9.5 was not.
  h2: { fontSize: 13.5, fontWeight: 600, marginBottom: 8, marginTop: 24 },
  label: { fontSize: 8.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, marginBottom: 3 },
  muted: { color: C.muted },

  row: { flexDirection: "row", justifyContent: "space-between" },
  cols: { flexDirection: "row", gap: 28, marginTop: 22 },
  col: { flex: 1 },

  rule: { height: 1, backgroundColor: C.line, marginVertical: 14 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, overflow: "hidden", marginTop: 8 },
  th: { flexDirection: "row", backgroundColor: "#EFF6FF", paddingVertical: 8, paddingHorizontal: 10 },
  tr: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.line },
  thText: { fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted },

  totals: { marginTop: 14, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 9, borderTopWidth: 1.5, borderTopColor: C.ink },
  grandText: { fontSize: 14, fontWeight: 600 },

  badge: { backgroundColor: C.lime, color: C.limeText, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 3, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" },
  callout: { backgroundColor: "#F0FDF4", borderLeftWidth: 2.5, borderLeftColor: C.lime, padding: 13, marginTop: 14 },

  // The single biggest change. This style carries the terms and conditions of
  // every agreement and the whole second page of the offer letter — the text a
  // person is most expected to read, previously the smallest and faintest on
  // the page. Now full body size in ink, with generous leading.
  terms: { fontSize: 10, color: C.ink, lineHeight: 1.75 },
  signRow: { flexDirection: "row", gap: 40, marginTop: 34 },
  signBox: { flex: 1, borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 6 },

  footer: { position: "absolute", left: 52, right: 52, bottom: 28, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, fontSize: 8, color: C.muted },
});
