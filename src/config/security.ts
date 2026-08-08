/**
 * How client data is actually protected.
 *
 * Read by the public `/security` page and the security PDF, so the answer a
 * client reads on the website is the answer they get attached to a
 * questionnaire.
 *
 * **Every line here is a statement of what is true today, not what is
 * planned.** This is the one document where an aspiration becomes a
 * misrepresentation the moment somebody buys on the strength of it. If a
 * control is partial, say so — "reviewed manually" is a fine answer and a false
 * "automated" is not.
 */

export type SecuritySection = {
  title: string;
  points: string[];
};

export const SECURITY_SECTIONS: SecuritySection[] = [
  {
    title: "Where data lives",
    points: [
      "Application data is held in a managed Postgres database (Supabase) with the region set on the project.",
      "Files — agreements, invoices, deliverables — are held in private storage buckets, never public ones.",
      "The application runs on Vercel. No client data is stored on personal machines as part of normal work.",
    ],
  },
  {
    title: "Encryption",
    points: [
      "All traffic is HTTPS. The application is not reachable over plain HTTP.",
      "Data is encrypted at rest by the database and storage provider.",
      "Stored third-party credentials a client shares with us are encrypted in the application before they reach the database, so a database dump alone does not expose them.",
    ],
  },
  {
    title: "Who can see what",
    points: [
      "Three roles: owner, admin and staff. Staff see only the clients they are assigned to — enforced in every database query, not by hiding menu items.",
      "Salary, margin, cost-per-hour and the audit log are restricted to owner and admin.",
      "Clients see only their own account through the portal, and each client-facing screen re-derives who is asking from the session rather than trusting anything in the URL.",
      "Row-level security is enabled on client data; privileged reads go through a server-side service role that is never exposed to a browser.",
    ],
  },
  {
    title: "Accountability",
    points: [
      "Around forty kinds of change are written to an append-only audit log: who edited a project, who deleted a file, who changed an invoice, who signed in and who failed to.",
      "The log records the actor, the time, the IP and the before/after values. Passwords and tokens are never recorded.",
      "Admin sessions expire after 24 hours, and after 2 hours of inactivity.",
    ],
  },
  {
    title: "Backups and continuity",
    points: [
      "Database backups are handled by the managed database provider on their standard schedule for the project's plan.",
      "Generated documents can be re-created from their source records, so a lost PDF is not lost data.",
    ],
  },
  {
    title: "If something goes wrong",
    points: [
      "We investigate as soon as we are aware, and contain first.",
      "Affected clients are told within 72 hours of us becoming aware of a personal-data breach, with what we know at that point rather than waiting for a complete picture.",
      "The Data Processing Agreement sets this out contractually.",
    ],
  },
  {
    title: "Leaving",
    points: [
      "On request we return or delete client data, except anything we must keep by law and copies held in automated backups until they age out.",
      "Source code, files and credentials transfer to the client on full payment — ownership is written into every agreement.",
    ],
  },
];

/** Shown at the top of both surfaces so nobody over-reads the document. */
export const SECURITY_PREAMBLE =
  "This describes how Nex Desk protects the data our clients trust us with. It is a plain statement of current practice, not a certification. If your procurement process needs something specific, ask and we will answer directly rather than sending a longer document.";
