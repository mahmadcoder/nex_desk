import { createAdminClient } from "@/lib/supabase/server";

/**
 * The open pixel for an `email_log` row.
 *
 * `email_log.opened_at` has existed in the schema since the beginning and was
 * never written or read anywhere, so every agreement, quote and invoice went
 * out blind.
 *
 * Public and unauthenticated by necessity — it is fetched by a mail client, not
 * a signed-in browser. The id is a UUID minted in `sendEmail`, and the only
 * thing a valid one grants is the ability to mark a message read, so the
 * exposure is a timestamp rather than any content.
 *
 * The route must NEVER fail visibly: a broken image in a client's inbox is a
 * far worse outcome than a missed statistic, so every path returns the GIF.
 */

// A 1×1 fully transparent GIF. Kept as a constant so the response allocates
// nothing per request.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function gif() {
  return new Response(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      // Without this, Gmail's image proxy caches the pixel and a later open
      // never reaches us at all.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Checked before the query so a junk path segment never reaches Postgres,
    // which would reject a malformed uuid as an error rather than no rows.
    if (!UUID_RE.test(id)) return gif();

    const { error } = await createAdminClient()
      .from("email_log")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", id)
      // Only the first open. Re-opens must not move the timestamp, or the
      // column stops answering "when did they first see this?".
      .is("opened_at", null);

    if (error) console.error("open pixel: could not stamp opened_at", error);
  } catch (e) {
    console.error("open pixel failed:", e);
  }

  return gif();
}
