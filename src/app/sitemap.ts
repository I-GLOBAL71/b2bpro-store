import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { POLE_LABELS, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts, sellers] = await Promise.all([
    db.service.findMany({ select: { slug: true, createdAt: true } }),
    db.blogPost.findMany({ select: { slug: true, publishedAt: true } }),
    db.seller.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/services`, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE.url}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/support`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const categoryPages: MetadataRoute.Sitemap = Object.keys(POLE_LABELS).map((slug) => ({
    url: `${SITE.url}/categories/${slug}`,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE.url}/services/${s.slug}`,
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
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...servicePages, ...blogPages, ...sellerPages];
}
