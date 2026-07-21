import { Text, View, Svg, Path, Rect } from "@react-pdf/renderer";
import { s, C } from "./theme";

export function Mark() {
  return (
    <Svg width={26} height={26} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={13} fill={C.ink} />
      <Path d="M18 46V18l13 19V18" stroke={C.bone} strokeWidth={5} fill="none" />
      <Path d="M38 26l6 6-6 6" stroke={C.lime} strokeWidth={5} fill="none" />
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
      <Text>Nex Desk · ahmadsadiq.dev@gmail.com</Text>
      <Text render={({ pageNumber, totalPages }) => `${number} · page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export const fmt = (n: number, cur = "PKR") => {
  const sym: Record<string, string> = { PKR: "Rs", USD: "$", GBP: "£", EUR: "€", AED: "AED" };
  return `${sym[cur] ?? cur} ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
};

export const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
