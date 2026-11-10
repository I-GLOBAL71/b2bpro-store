import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { POLE_LABELS, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts, sellers] = await Promise.all([
    // poleSlug nécessaire pour dater chaque catégorie via son service le plus récent.
    db.service.findMany({ select: { slug: true, createdAt: true, poleSlug: true } }),
    db.blogPost.findMany({ select: { slug: true, publishedAt: true } }),
    db.seller.findMany({ select: { slug: true, createdAt: true } }),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE.url}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Catégories : lastmod = date du service le plus récent du pôle (fallback : jour).
  const lastServiceByPole = new Map<string, Date>();
  for (const s of services) {
    const current = lastServiceByPole.get(s.poleSlug);
    if (!current || s.createdAt > current) lastServiceByPole.set(s.poleSlug, s.createdAt);
  }

  const categoryPages: MetadataRoute.Sitemap = Object.keys(POLE_LABELS).map((slug) => ({
    url: `${SITE.url}/categories/${slug}`,
    lastModified: lastServiceByPole.get(slug) ?? now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE.url}/services/${s.slug}`,
    lastModified: s.createdAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE.url}/blog/${p.slug}`,
    lastModified: p.publishedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const sellerPages: MetadataRoute.Sitemap = sellers.map((s) => ({
    url: `${SITE.url}/vendeurs/${s.slug}`,
    lastModified: s.createdAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...servicePages, ...blogPages, ...sellerPages];
}
