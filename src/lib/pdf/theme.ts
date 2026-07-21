import { StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-500-normal.woff", fontWeight: 500 },
  ],
});

export const C = {
  ink: "#0B0B0F",
  ink700: "#3A3A44",
  bone: "#F4F1EA",
  lime: "#D0FF4E",
  limeText: "#2A3A00",
  line: "#DEDACE",
  muted: "#75736C",
  ok: "#1D9E75",
  warn: "#BA7517",
};

/** Documents print on bone, not white — same warm paper the brand uses on screen. */
export const s = StyleSheet.create({
  page: { backgroundColor: "#FBFAF6", padding: 44, fontFamily: "Inter", fontSize: 9.5, color: C.ink, lineHeight: 1.55 },

  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottomWidth: 1.5, borderBottomColor: C.ink },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 15, fontWeight: 500, letterSpacing: -0.4 },
  docType: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: C.muted },
  docNo: { fontSize: 17, fontWeight: 500, letterSpacing: -0.5, marginTop: 3 },

  h1: { fontSize: 20, fontWeight: 500, letterSpacing: -0.5, marginBottom: 6 },
  h2: { fontSize: 11, fontWeight: 500, marginBottom: 7, marginTop: 20 },
  label: { fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, marginBottom: 3 },
  muted: { color: C.muted },

  row: { flexDirection: "row", justifyContent: "space-between" },
  cols: { flexDirection: "row", gap: 28, marginTop: 22 },
  col: { flex: 1 },

  rule: { height: 1, backgroundColor: C.line, marginVertical: 14 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, overflow: "hidden", marginTop: 8 },
  th: { flexDirection: "row", backgroundColor: "#F1EEE4", paddingVertical: 7, paddingHorizontal: 10 },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.line },
  thText: { fontSize: 7.5, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted },

  totals: { marginTop: 14, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 9, borderTopWidth: 1.5, borderTopColor: C.ink },
  grandText: { fontSize: 13, fontWeight: 500 },

  badge: { backgroundColor: C.lime, color: C.limeText, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 3, fontSize: 8, fontWeight: 500, letterSpacing: 0.6, textTransform: "uppercase" },
  callout: { backgroundColor: "#F1EEE4", borderLeftWidth: 2.5, borderLeftColor: C.lime, padding: 12, marginTop: 14 },

  terms: { fontSize: 8, color: C.muted, lineHeight: 1.7 },
  signRow: { flexDirection: "row", gap: 40, marginTop: 34 },
  signBox: { flex: 1, borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 6 },

  footer: { position: "absolute", left: 44, right: 44, bottom: 26, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, fontSize: 7.5, color: C.muted },
});
