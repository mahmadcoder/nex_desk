import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from "@/lib/utils";

/**
 * Who the agency is, on paper.
 *
 * The Settings page has always let you edit `company_name`, `address`, `phone`
 * and `whatsapp`, and nothing has ever read them. Documents hardcoded
 * "Nex Desk" (`pdf/parts.tsx:33`) and the literal "Multan, Pakistan"
 * (`pdf/documents.tsx:31`), and emails hardcoded the company name
 * (`email/send.ts:150`). Every one of those now comes through here.
 *
 * Falls back to the env constants field by field, so a blank column can never
 * put an empty header on an invoice.
 */

export type Agency = {
  name: string;
  tagline: string | null;
  email: string;
  phone: string | null;
  whatsapp: string;
  /** One line: address, city, country — whichever are set. */
  location: string;
  taxId: string | null;
  logoUrl: string | null;
  website: string | null;
  adminSignature: string | null;
};

export const AGENCY_FALLBACK: Agency = {
  name: "Nex Desk",
  tagline: "Software agency",
  email: CONTACT_EMAIL,
  phone: null,
  whatsapp: CONTACT_WHATSAPP,
  location: "Multan, Pakistan",
  taxId: null,
  logoUrl: null,
  website: null,
  adminSignature: null,
};

/**
 * `cache` dedupes this per request — a single PDF render reads it from several
 * components, and an invoice should not make the same round trip four times.
 */
export const getAgency = cache(async (): Promise<Agency> => {
  try {
    const { data } = await createAdminClient()
      .from("settings")
      .select("company_name, tagline, email, phone, whatsapp, address, city, country, tax_id, logo_url, website, admin_signature")
      .eq("id", 1)
      .maybeSingle();

    if (!data) return AGENCY_FALLBACK;

    const location =
      [data.address, data.city, data.country].map((p) => String(p ?? "").trim()).filter(Boolean).join(", ") ||
      AGENCY_FALLBACK.location;

    return {
      name: String(data.company_name || "").trim() || AGENCY_FALLBACK.name,
      tagline: String(data.tagline || "").trim() || AGENCY_FALLBACK.tagline,
      email: String(data.email || "").trim() || AGENCY_FALLBACK.email,
      phone: String(data.phone || "").trim() || null,
      whatsapp: String(data.whatsapp || "").trim() || AGENCY_FALLBACK.whatsapp,
      location,
      // 42703 on a pre-2027-19 database lands in the catch below, so a missing
      // column degrades to "no tax id" rather than an unrenderable document.
      taxId: String(data.tax_id || "").trim() || null,
      logoUrl: String(data.logo_url || "").trim() || null,
      website: String(data.website || "").trim() || null,
      adminSignature: (data as any)?.admin_signature ? String((data as any).admin_signature).trim() : null,
    };
  } catch (e) {
    console.error("getAgency: falling back to defaults —", e);
    return AGENCY_FALLBACK;
  }
});
