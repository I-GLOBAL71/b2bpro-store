/**
 * Générateur de flux RSS 2.0 conformes pour l'auto-publication gratuite :
 *   - /pinterest-rss.xml  (Pinterest Business -> Revendiquer -> Flux RSS)
 *   - /syndication-rss.xml (Import RSS automatique Hashnode / Medium / Flipboard)
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { parseThumbUrls, safeJsonParse } from "@/lib/contracts";
import { getSiteUrl } from "@/lib/env";
import { sanitizeNoEmDash } from "@/lib/prospecting/types";

export interface RssItemInput {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate: Date;
  imageUrl?: string;
  contentHtml?: string;
  author?: string;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCdata(html: string): string {
  return html.replace(/]]>/g, "]]]]><![CDATA[>");
}

export function buildRssXml(params: {
  title: string;
  description: string;
  feedUrl: string;
  siteUrl: string;
  items: RssItemInput[];
  includeContentNamespace?: boolean;
}): string {
  const ns = params.includeContentNamespace
    ? ' xmlns:content="http://purl.org/rss/1.0/modules/content/"'
    : "";

  const itemsXml = params.items
    .map((item) => {
      const enclosure = item.imageUrl
        ? `\n      <enclosure url="${escapeXml(item.imageUrl)}" length="0" type="image/webp" />`
        : "";
      const contentNode = item.contentHtml
        ? `\n      <content:encoded><![CDATA[${escapeCdata(item.contentHtml)}]]></content:encoded>`
        : "";
      const authorNode = item.author
        ? `\n      <author>${escapeXml(item.author)}</author>`
        : "";

      return [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
        `      <pubDate>${item.pubDate.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(item.description)}</description>${authorNode}${enclosure}${contentNode}`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rss version="2.0"${ns} xmlns:atom="http://www.w3.org/2005/Atom">`,
    "  <channel>",
    `    <title>${escapeXml(params.title)}</title>`,
    `    <link>${escapeXml(params.siteUrl)}</link>`,
    `    <description>${escapeXml(params.description)}</description>`,
    "    <language>fr-FR</language>",
    `    <atom:link href="${escapeXml(params.feedUrl)}" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    itemsXml,
    "  </channel>",
    "</rss>",
  ].join("\n");
}

function loadBlogManifest(): Record<string, { blobUrl?: string }> {
  try {
    const manifestPath = path.join(process.cwd(), "public", "img", "blog", "manifest.json");
    if (!existsSync(manifestPath)) return {};
    return safeJsonParse<Record<string, { blobUrl?: string }>>(
      readFileSync(manifestPath, "utf8"),
      {},
    );
  } catch {
    return {};
  }
}

export async function generatePinterestRssXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const manifest = loadBlogManifest();

  const [services, posts] = await Promise.all([
    db.service.findMany({
      orderBy: { salesCount: "desc" },
      take: 25,
      select: {
        slug: true,
        title: true,
        shortDesc: true,
        basePrice: true,
        deliveryDays: true,
        thumbUrls: true,
        createdAt: true,
      },
    }),
    db.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: 15,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
      },
    }),
  ]);

  const serviceItems: RssItemInput[] = services.map((s) => {
    const thumbs = parseThumbUrls(s.thumbUrls);
    const imageUrl = thumbs?.[0] || `${siteUrl}/og-default.png`;
    return {
      title: sanitizeNoEmDash(`${s.title} (${s.basePrice} EUR)`),
      link: `${siteUrl}/services/${s.slug}?utm_source=pinterest&utm_medium=rss`,
      guid: `${siteUrl}/services/${s.slug}`,
      description: sanitizeNoEmDash(
        `${s.shortDesc} Livraison en ${s.deliveryDays} jours ouvrés dès ${s.basePrice} € avec paiement séquestré sur b2bpro.store.`,
      ),
      pubDate: s.createdAt,
      imageUrl,
    };
  });

  const blogItems: RssItemInput[] = posts.map((p) => {
    const blob = manifest[p.slug]?.blobUrl;
    return {
      title: sanitizeNoEmDash(p.title),
      link: `${siteUrl}/blog/${p.slug}?utm_source=pinterest&utm_medium=rss`,
      guid: `${siteUrl}/blog/${p.slug}`,
      description: sanitizeNoEmDash(p.excerpt),
      pubDate: p.publishedAt,
      imageUrl: blob && /^https:\/\//.test(blob) ? blob : `${siteUrl}/img/blog/${p.slug}.webp`,
    };
  });

  return buildRssXml({
    title: "b2bpro.store - Visuels Services & Guides B2B",
    description:
      "Services digitaux B2B francophones dès 20 EUR : veille concurrentielle, leads B2B, IA et SEO.",
    feedUrl: `${siteUrl}/pinterest-rss.xml`,
    siteUrl,
    items: [...serviceItems, ...blogItems],
  });
}

function simpleMarkdownToHtml(md: string, siteUrl: string): string {
  const clean = sanitizeNoEmDash(md)
    .replace(/\]\(\/services\//g, `](${siteUrl}/services/`)
    .replace(/\]\(\/blog\//g, `](${siteUrl}/blog/`)
    .replace(/\]\(\/support/g, `](${siteUrl}/support`);

  return clean
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
      const linked = trimmed.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2">$1</a>',
      );
      return `<p>${linked.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function generateSyndicationRssXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const manifest = loadBlogManifest();

  const [posts, topServices] = await Promise.all([
    db.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: 25,
    }),
    db.service.findMany({
      orderBy: { salesCount: "desc" },
      take: 2,
      select: { slug: true, title: true, basePrice: true, deliveryDays: true },
    }),
  ]);

  const ctaHtml = [
    "<hr/>",
    "<h2>Passer à l'action en 48 h sur b2bpro.store</h2>",
    "<ul>",
    ...topServices.map(
      (s) =>
        `<li><a href="${siteUrl}/services/${s.slug}?utm_source=rss">${sanitizeNoEmDash(s.title)}</a> (${s.basePrice} EUR, livraison ${s.deliveryDays} j)</li>`,
    ),
    "</ul>",
    `<p>Une question avant de commander ? <a href="${siteUrl}/support?utm_source=rss">Contacter le support b2bpro.store</a>.</p>`,
  ].join("");

  const items: RssItemInput[] = posts.map((p) => {
    const blob = manifest[p.slug]?.blobUrl;
    return {
      title: sanitizeNoEmDash(p.title),
      link: `${siteUrl}/blog/${p.slug}?utm_source=rss`,
      guid: `${siteUrl}/blog/${p.slug}`,
      description: sanitizeNoEmDash(p.excerpt),
      pubDate: p.publishedAt,
      imageUrl: blob && /^https:\/\//.test(blob) ? blob : `${siteUrl}/img/blog/${p.slug}.webp`,
      contentHtml: `${simpleMarkdownToHtml(p.content, siteUrl)}${ctaHtml}`,
      author: "contact@b2bpro.store (Thomas Laurent)",
    };
  });

  return buildRssXml({
    title: "b2bpro.store - Guides Experts B2B Francophones",
    description:
      "Guides pratiques de prospection B2B, veille concurrentielle, IA RAG et SEO/GEO pour dirigeants francophones.",
    feedUrl: `${siteUrl}/syndication-rss.xml`,
    siteUrl,
    items,
    includeContentNamespace: true,
  });
}
