/**
 * Where a client came from.
 *
 * Lived inside ClientDialog.tsx, a client component — which meant the server
 * could not read the list without pulling a whole dialog into the bundle.
 * `clients.source` is free text (`schema.sql:174`) and the dialog writes an
 * arbitrary typed string when "Other" is picked, so anything not in this list
 * is a valid stored value and gets folded into "Other" when grouping.
 */
export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "fiverr", label: "Fiverr" },
  { id: "upwork", label: "Upwork" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "website", label: "Website (Inbound)" },
  { id: "dribbble_behance", label: "Dribbble / Behance" },
  { id: "twitter", label: "Twitter / X" },
  { id: "youtube_tiktok", label: "YouTube / TikTok" },
  { id: "referral", label: "Client Referral" },
  { id: "cold_outreach", label: "Cold Email / Outreach" },
  { id: "whatsapp", label: "WhatsApp / Phone Call" },
  { id: "other", label: "Other (Type Custom Platform…)" },
];

/** Short label for a chart axis — the dialog's parenthetical hints are noise there. */
export const SOURCE_SHORT: Record<string, string> = {
  website: "Website",
  dribbble_behance: "Dribbble",
  youtube_tiktok: "YouTube",
  referral: "Referral",
  cold_outreach: "Cold outreach",
  whatsapp: "WhatsApp",
  twitter: "Twitter / X",
  other: "Other",
};
