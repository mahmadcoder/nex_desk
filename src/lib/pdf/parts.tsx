import { Text, View, Svg, Rect, Image } from "@react-pdf/renderer";
import { s, C } from "./theme";
import { CONTACT_EMAIL, money } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";

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

/**
 * Who these documents say they are from.
 *
 * Primed by `setDocAgency()` immediately before a render rather than threaded
 * as a prop through nine document components and twenty-eight call sites.
 *
 * That is only safe because there is exactly ONE agency: `settings` is a
 * singleton enforced in Postgres by `check (id = 1)`, so two concurrent PDF
 * renders necessarily write the identical value here. Do not copy this pattern
 * for anything that varies per request — for that, pass a prop.
 */
let DOC_AGENCY: {
  name: string;
  tagline: string | null;
  email: string;
  location: string;
  taxId: string | null;
  logoUrl: string | null;
  adminSignature?: string | null;
} = {
  name: "Nex Desk",
  tagline: "Software agency",
  email: CONTACT_EMAIL,
  location: "Multan, Pakistan",
  taxId: null,
  logoUrl: null,
  adminSignature: null,
};

export function setDocAgency(a: typeof DOC_AGENCY) {
  DOC_AGENCY = a;
}

export const docAgency = () => DOC_AGENCY;

export function DocHeader({ type, number }: { type: string; number: string }) {
  const agency = DOC_AGENCY;
  const name = agency.name;
  const tagline = agency.tagline || "Software agency";

  return (
    <View style={s.headerBar}>
      <View style={s.brandBlock}>
        {/* An uploaded logo replaces the drawn mark. @react-pdf fetches the
            URL at render time, so a dead or slow link would take invoice
            generation down with it — hence the vector mark stays the default
            and the Image is only reached when a logo is actually set. */}
        {agency.logoUrl ? <Image src={agency.logoUrl} style={{ width: 26, height: 26 }} /> : <Mark />}
        <View>
          <Text style={s.brandName}>{name}</Text>
          <Text style={{ fontSize: 9, color: C.muted }}>{tagline}</Text>
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
      <Text>{DOC_AGENCY.name} · {DOC_AGENCY.email}</Text>
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
  d ? fmtDate(d) : "—";
