import type { MetadataRoute } from "next";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/intake` holds single-use onboarding links. The pages carry noindex
        // too — this is the belt to that pair of braces, and only the prefix is
        // named here, never a token.
        disallow: [`/${ADMIN}`, `/${ADMIN}/`, "/portal", "/api", "/intake"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
