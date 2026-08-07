/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Emits one structured-data block.
 *
 * `dangerouslySetInnerHTML` is the documented way to do this — React escapes
 * text children, which would corrupt the JSON. The `<` escape guards against a
 * stray `</script>` inside DB-authored copy (an FAQ answer, a post excerpt)
 * closing the tag early.
 */
export default function JsonLd({ data }: { data: any }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
