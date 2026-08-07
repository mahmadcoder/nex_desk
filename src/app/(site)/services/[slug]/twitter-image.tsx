// X treats twitter-image as a separate file convention from opengraph-image,
// so it needs its own file even when the card is identical. Re-export, do not
// duplicate the renderer.
export { default, size, contentType, alt, generateStaticParams } from "./opengraph-image";
