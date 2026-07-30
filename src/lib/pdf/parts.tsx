import { Text, View, Svg, Rect } from "@react-pdf/renderer";
import { s, C } from "./theme";
import { CONTACT_EMAIL, money } from "@/lib/utils";

/**
 * The Nex Desk logomark, matching `components/brand/Logo.tsx` (LogoTile):
 * a lime screen block sitting above the desk surface.
 *
 * Every document renders this through `DocHeader`, so this is the single place
 * the printed mark is defined. It previously drew an older "N + caret" glyph
 * that no longer matched the site or the favicon.
 */
export function Mark() {
  return (
    <Svg width={26} height={26} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={14} fill={C.ink} />
      {/* Screen block — the one lime accent */}
      <Rect x={22} y={14} width={20} height={22} rx={4} fill={C.lime} />
      {/* Highlight on the screen */}
      <Rect x={25} y={17} width={5} height={13} rx={1.5} fill={C.bone} opacity={0.18} />
      {/* Desk surface */}
      <Rect x={12} y={42} width={40} height={5} rx={2.5} fill={C.bone} opacity={0.9} />
    </Svg>
  );
}

export function DocHeader({ type, number }: { type: string; number: string }) {
  return (
    <View style={s.headerBar}>
      <View style={s.brandBlock}>
        <Mark />
        <View>
          <Text style={s.brandName}>Nex Desk</Text>
          <Text style={{ fontSize: 7.5, color: C.muted }}>Software agency</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.docType}>{type}</Text>
        <Text style={s.docNo}>{number}</Text>
      </View>
    </View>
  );
}

export function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 9 }}>
      <Text style={s.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function DocFooter({ number }: { number: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Nex Desk · {CONTACT_EMAIL}</Text>
      <Text render={({ pageNumber, totalPages }) => `${number} · page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

/**
 * Currency formatting for documents.
 *
 * Re-exports the single screen formatter so a PDF can never disagree with the
 * page it was generated from.
 */
export const fmt = money;

export const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
