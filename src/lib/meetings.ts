/**
 * Which tool a meeting link opens in.
 *
 * Matched on the HOST, not on a substring of the whole URL. A link like
 * `https://acme.com/blog/zoom-vs-meet` contains "zoom" and is not a Zoom call —
 * substring matching would badge it as one, and a client clicking "Join Zoom"
 * on a blog post is a small betrayal of trust in every other label on the page.
 */

export type MeetingProvider = {
  label: string;
  /** Tailwind text colour for the badge. */
  tone: string;
};

/**
 * The domain itself, or a subdomain of it — never a lookalike.
 *
 * A plain `endsWith("zoom.us")` also matches `evil-zoom.us`, which is exactly
 * the shape a phishing link takes. The leading dot is what makes
 * `us02web.zoom.us` pass and `evil-zoom.us` fail.
 */
const is = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

const HOSTS: { match: (host: string) => boolean; provider: MeetingProvider }[] = [
  { match: (h) => is(h, "meet.google.com"), provider: { label: "Google Meet", tone: "text-[#00AC47]" } },
  { match: (h) => is(h, "zoom.us") || is(h, "zoom.com"), provider: { label: "Zoom", tone: "text-[#4A8CFF]" } },
  { match: (h) => is(h, "teams.microsoft.com") || is(h, "teams.live.com"), provider: { label: "Teams", tone: "text-[#6264A7]" } },
  { match: (h) => is(h, "whereby.com"), provider: { label: "Whereby", tone: "text-lime-400" } },
  { match: (h) => is(h, "meet.jit.si"), provider: { label: "Jitsi", tone: "text-lime-400" } },
  { match: (h) => is(h, "wa.me") || is(h, "whatsapp.com"), provider: { label: "WhatsApp", tone: "text-[#25D366]" } },
];

export function meetingProvider(url?: string | null): MeetingProvider | null {
  if (!url?.trim()) return null;

  let host: string;
  try {
    // A pasted link often has no scheme; URL() rejects those outright.
    host = new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }

  const bare = host.replace(/^www\./, "");
  return HOSTS.find((h) => h.match(bare))?.provider ?? { label: "Join link", tone: "text-lime-400" };
}
