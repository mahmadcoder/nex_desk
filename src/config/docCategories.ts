/**
 * Handbook categories.
 *
 * Here rather than in `actions/internalDocs.ts` because that file is
 * `"use server"` — every export there must be an async function, so a const
 * array in it fails the build. Same reason `employeeStatus.ts` exists.
 *
 * Mirrors the check constraint on `internal_docs.category`.
 */
export const DOC_CATEGORIES = [
  ["sop", "Standard operating procedures"],
  ["brand", "Brand guidelines"],
  ["policy", "Policies"],
  ["template", "Templates"],
  ["resource", "Resources"],
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number][0];

export const categoryLabel = (key: string) =>
  DOC_CATEGORIES.find(([k]) => k === key)?.[1] ?? "Resources";
