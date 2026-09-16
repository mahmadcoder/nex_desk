import { daysUntil } from "@/lib/utils";

export interface InternshipDetails {
  isIntern: boolean;
  endDate: string | null;
  daysUntilEnd: number | null;
  isEnded: boolean;
  status: "active" | "ended" | "converted" | "none";
  convertedAt?: string | null;
  previousSeniority?: string | null;
}

/**
 * Parses employee records to detect internship track, end date countdown, and conversion history.
 */
export function parseInternship(employee: {
  seniority?: string | null;
  employment_type?: string | null;
  notes?: unknown;
}): InternshipDetails {
  if (!employee) {
    return {
      isIntern: false,
      endDate: null,
      daysUntilEnd: null,
      isEnded: false,
      status: "none",
    };
  }

  let notesObj: Record<string, any> = {};
  if (typeof employee.notes === "object" && employee.notes !== null) {
    notesObj = employee.notes as Record<string, any>;
  } else if (typeof employee.notes === "string" && employee.notes.trim().startsWith("{")) {
    try {
      notesObj = JSON.parse(employee.notes.trim());
    } catch {
      notesObj = {};
    }
  }

  const internshipData = notesObj.internship || {};
  const isSeniorityIntern = String(employee.seniority || "").toLowerCase() === "intern";
  const isTypeIntern = String(employee.employment_type || "").toLowerCase() === "internship";
  const isCurrentIntern = isSeniorityIntern || isTypeIntern;

  // If already converted from internship
  if (internshipData.status === "converted" || internshipData.converted_at) {
    return {
      isIntern: false,
      endDate: internshipData.end_date || null,
      daysUntilEnd: null,
      isEnded: true,
      status: "converted",
      convertedAt: internshipData.converted_at || null,
      previousSeniority: internshipData.previous_seniority || "Intern",
    };
  }

  if (!isCurrentIntern) {
    return {
      isIntern: false,
      endDate: null,
      daysUntilEnd: null,
      isEnded: false,
      status: "none",
    };
  }

  const endDate = internshipData.end_date || null;
  let days: number | null = null;
  let isEnded = false;

  if (endDate) {
    days = daysUntil(endDate);
    isEnded = days !== null && days < 0;
  }

  return {
    isIntern: true,
    endDate,
    daysUntilEnd: days,
    isEnded,
    status: isEnded ? "ended" : "active",
  };
}
