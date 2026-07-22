/**
 * One place to manage every visual on the site.
 *
 * The philosophy: don't lean on random stock photography — it's the fastest way
 * to make a site look templated. Instead:
 *   1. Most "images" are UI mockups drawn in code (see components/site/mockups).
 *   2. Avatars come from DiceBear — generated, consistent, keyless, distinctive.
 *   3. When you genuinely want a real photo, drop a Pexels URL into the maps
 *      below. Nothing here depends on an external image loading, so the site
 *      never shows a broken picture.
 */

/* ------------------------------------------------------------------ *
 * AVATARS — DiceBear (https://dicebear.com). No API key, no config.
 * Same seed always returns the same face, so testimonials stay stable.
 * ------------------------------------------------------------------ */

export type AvatarStyle = "notionists" | "notionists-neutral" | "glass" | "shapes";

export function avatar(seed: string, style: AvatarStyle = "notionists-neutral") {
  const bg = "0B0B0F,131318,1B1B22"; // ink tones behind the avatar
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${bg}&radius=50`;
}

/* ------------------------------------------------------------------ *
 * REAL PHOTOS — swap these for your own Pexels URLs whenever you like.
 *
 * How to get one: go to pexels.com, open a photo, right-click the image,
 * "copy image address", paste it here. Free, no attribution required.
 *
 * Leave a value as `null` and the component falls back to a code-drawn
 * visual instead — so an empty map still looks finished.
 * ------------------------------------------------------------------ */

export const photos: Record<string, string | null> = {
  // About → founder note. Put a real headshot here when you have one.
  founder: null,
  // About → culture strip. Real workspace shots read best here.
  culture1: null,
  culture2: null,
  culture3: null,
};

/* ------------------------------------------------------------------ *
 * CASE-STUDY / WORK COVERS
 * These come from the database (case_studies.cover_url). Where a case
 * study has no cover yet, WorkShowcase draws a device frame instead.
 * ------------------------------------------------------------------ */

/** Deterministic gradient from a string — used behind mockups and empty covers. */
export function gradientFor(seed: string) {
  const palettes = [
    ["#5B3DF5", "#0B0B0F"],
    ["#D0FF4E", "#1B1B22"],
    ["#2A3A00", "#0B0B0F"],
    ["#5B3DF5", "#D0FF4E"],
    ["#131318", "#5B3DF5"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = palettes[h % palettes.length];
  const angle = h % 360;
  return `linear-gradient(${angle}deg, ${a}, ${b})`;
}
