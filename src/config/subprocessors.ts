/**
 * Every third party that can touch client data, named.
 *
 * Read by BOTH the DPA and the public security page, because a DPA that names
 * a service you no longer use — or omits one you do — is worse than having no
 * DPA at all. It is a written statement a client relied on, and it is false.
 *
 * **Change this file the same day you add or drop a service.** Both documents
 * move together automatically; nothing else needs editing.
 */

export type SubProcessor = {
  name: string;
  /** What it does for us, in the client's terms rather than ours. */
  purpose: string;
  /** Where the data physically sits, as best we can state it. */
  location: string;
  /** True when client personal data can reach it, false for metadata only. */
  handlesPersonalData: boolean;
};

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: "Supabase",
    purpose: "Database, file storage and authentication — where the project data lives",
    location: "As configured on the project; region shown in the Supabase dashboard",
    handlesPersonalData: true,
  },
  {
    name: "Vercel",
    purpose: "Application hosting and delivery",
    location: "Global edge network, primary region as configured",
    handlesPersonalData: true,
  },
  {
    name: "Google (Gmail)",
    purpose: "Sending agreements, invoices and notifications by email",
    location: "Google data centres",
    handlesPersonalData: true,
  },
  {
    name: "Google (Gemini API)",
    purpose: "Drafting assistance for scope text, summaries and replies",
    location: "Google Cloud",
    // Only what an admin puts into an assist box — never a bulk export, and
    // never automatically.
    handlesPersonalData: true,
  },
  {
    name: "Groq",
    purpose: "Fallback drafting assistance when the primary model is unavailable",
    location: "Groq Cloud",
    handlesPersonalData: true,
  },
  {
    name: "Vercel Analytics",
    purpose: "Counting page views on the public website",
    location: "Vercel",
    // No cookies, no identifiers — which is exactly why it needs no banner.
    handlesPersonalData: false,
  },
];
