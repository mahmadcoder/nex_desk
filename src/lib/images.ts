/**
 * Every visual on the site is managed here.
 *
 * Sources, in order of use:
 *   1. Verified Unsplash & Pexels photographs — used as rich, high-definition
 *      article covers and section backdrops.
 *   2. DiceBear — generated avatars for people, keyless and consistent.
 *   3. Code-drawn UI mockups for product shots.
 */

/* ---------------- ARTICLE & EDITORIAL COVER PHOTOS ---------------- */

export const ARTICLE_COVERS: Record<string, string> = {
  "why-we-write-scope-first":
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  "fast-websites-are-a-feature":
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  "own-your-code":
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  "design-systems-that-scale":
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
  "seo-engineering-for-saas":
    "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=1200&q=80",
};

/** High-resolution fallback photography list for articles */
const DEFAULT_ARTICLE_PHOTOS = [
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
];

/** Get an authentic, high-definition cover image for a blog article */
export function getPostCover(slug: string, coverUrl?: string | null): string {
  if (coverUrl && coverUrl.trim().length > 0) return coverUrl;
  if (ARTICLE_COVERS[slug]) return ARTICLE_COVERS[slug];

  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return DEFAULT_ARTICLE_PHOTOS[h % DEFAULT_ARTICLE_PHOTOS.length];
}

/* ---------------- PEXELS TEXTURES (backdrops) ---------------- */

const px = (id: number, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const textures = {
  dark: px(7130481),
  blue: px(7605372),
  green: px(7130532),
  colour: px(6985135),
};

export function textureFor(seed: string) {
  return getPostCover(seed);
}

/* ---------------- AVATARS (DiceBear, keyless) ---------------- */

export type AvatarStyle = "notionists" | "notionists-neutral" | "glass";

export function avatar(seed: string, style: AvatarStyle = "notionists") {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=131318,1b1b22&radius=50&scale=90`;
}

/* ---------------- CODE GRADIENT ---------------- */

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

export const photos: Record<string, string | null> = {
  founder: null,
};
