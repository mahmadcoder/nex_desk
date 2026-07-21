import type { MetadataRoute } from "next";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [`/${ADMIN}`, `/${ADMIN}/`, "/portal", "/api"] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
