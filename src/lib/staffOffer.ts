export interface StaffOfferAcceptance {
  isAccepted: boolean;
  acceptedAt: string | null;
  signedName: string | null;
  signatureData: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Parses employee notes field to extract digital offer letter acceptance metadata.
 * Designed with zero database migrations: stores cleanly as structured JSON in `employees.notes`
 * while preserving any existing admin notes.
 */
export function parseOfferAcceptance(rawNotes: unknown): StaffOfferAcceptance {
  if (!rawNotes) {
    return {
      isAccepted: false,
      acceptedAt: null,
      signedName: null,
      signatureData: null,
    };
  }

  let data: any = null;

  if (typeof rawNotes === "object" && rawNotes !== null) {
    data = rawNotes;
  } else if (typeof rawNotes === "string") {
    const trimmed = rawNotes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        data = null;
      }
    }
  }

  if (data?.offer_letter?.accepted_at && !data?.offer_letter?.is_reset) {
    return {
      isAccepted: true,
      acceptedAt: data.offer_letter.accepted_at,
      signedName: data.offer_letter.signed_name ?? null,
      signatureData: data.offer_letter.signature_data ?? null,
      ip: data.offer_letter.ip ?? null,
      userAgent: data.offer_letter.user_agent ?? null,
    };
  }

  return {
    isAccepted: false,
    acceptedAt: null,
    signedName: null,
    signatureData: null,
  };
}
