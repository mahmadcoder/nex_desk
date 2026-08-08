import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteBaseUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const db = createAdminClient();

  const [{ data: services }, { data: cases }, { data: posts }] = await Promise.all([
    db.from("services").select("slug").eq("is_active", true),
    db.from("case_studies").select("slug").eq("is_published", true),
    db.from("posts").select("slug, published_at").eq("is_published", true),
  ]);

  // Privacy, terms and security were missing. All three are pages a buyer
  // searches for by name before they contact you, so they belong here.
  const statics = [
    "", "/services", "/work", "/pricing", "/about", "/faq", "/checklist", "/blog", "/contact",
    "/security", "/privacy", "/terms",
  ];

  return [
    ...statics.map((p) => ({ url: `${base}${p}`, priority: p === "" ? 1 : 0.8 })),
    ...(services ?? []).map((s) => ({ url: `${base}/services/${s.slug}`, priority: 0.7 })),
    ...(cases ?? []).map((c) => ({ url: `${base}/work/${c.slug}`, priority: 0.6 })),
    ...(posts ?? []).map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.published_at ? new Date(p.published_at) : undefined,
      priority: 0.5,
    })),
  ];
}
