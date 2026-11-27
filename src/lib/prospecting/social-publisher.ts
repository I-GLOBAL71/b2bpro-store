/**
 * Syndication sociale 100 % autonome & gratuite :
 *   1. Publication automatique sur Dev.to (API officielle avec canonical_url)
 *   2. Génération du kit quotidien LinkedIn / X / Facebook B2B / WhatsApp
 *      prêt à copier en 1 clic dans /admin/prospection.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/contracts";
import { getSiteUrl } from "@/lib/env";
import {
  sanitizeNoEmDash,
  type SocialKitPost,
  type SocialState,
  type SocialSyndicationRecord,
} from "@/lib/prospecting/types";

const CATEGORY_TO_DEVTO_TAGS: Record<string, string[]> = {
  "IA & RAG": ["ai", "rag", "b2b", "productivity"],
  "SEO & GEO IA": ["seo", "ai", "marketing", "b2b"],
  "Prospection & Leads": ["b2b", "sales", "data", "growth"],
  "E-commerce & Pricing": ["ecommerce", "pricing", "data", "b2b"],
  "Veille & Concurrence": ["strategy", "data", "b2b", "analytics"],
  "RH & Recrutement": ["hr", "recruiting", "b2b", "data"],
  "Immobilier & Local": ["seo", "local", "data", "b2b"],
  "Marchés Publics": ["b2b", "business", "data", "france"],
  "SaaS & Tech": ["saas", "b2b", "tech", "productivity"],
  "Logistique & Franchises": ["logistics", "b2b", "data", "supplychain"],
};

function sanitizeDevtoTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const tag of raw) {
    const clean = tag
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    if (clean.length >= 2 && clean.length <= 20 && !out.includes(clean)) {
      out.push(clean);
    }
    if (out.length === 4) break;
  }
  return out.length > 0 ? out : ["b2b", "ai", "seo", "growth"];
}

function resolveBlogCoverUrl(slug: string, siteUrl: string): string {
  try {
    const manifestPath = path.join(process.cwd(), "public", "img", "blog", "manifest.json");
    if (existsSync(manifestPath)) {
      const parsed = safeJsonParse<Record<string, { blobUrl?: string }>>(
        readFileSync(manifestPath, "utf8"),
        {},
      );
      const blob = parsed[slug]?.blobUrl;
      if (blob && /^https:\/\//.test(blob)) return blob;
    }
  } catch {
    // Repli sur l'URL canonique du site
  }
  return `${siteUrl}/img/blog/${slug}.webp`;
}

function countDevtoPublishedToday(posts: SocialSyndicationRecord[]): number {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return posts.filter((p) => {
    const d = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(p.publishedAt));
    return d === today;
  }).length;
}

export async function publishNextBlogToDevto(params: {
  state: SocialState;
  dailyCap: number;
  dryRun: boolean;
}): Promise<{ record: SocialSyndicationRecord | null; error?: string }> {
  const apiKey = process.env.DEVTO_API_KEY?.trim();
  if (!apiKey) {
    return { record: null, error: "DEVTO_API_KEY non configurée" };
  }
  if (params.dailyCap <= 0) {
    return { record: null };
  }
  if (countDevtoPublishedToday(params.state.posts) >= params.dailyCap) {
    return { record: null };
  }

  const publishedSlugs = new Set(params.state.posts.map((p) => p.blogSlug));
  const candidates = await db.blogPost.findMany({
    orderBy: { publishedAt: "desc" },
    take: 60,
  });

  const post = candidates.find((c) => !publishedSlugs.has(c.slug));
  if (!post) {
    return { record: null };
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;
  const coverUrl = resolveBlogCoverUrl(post.slug, siteUrl);

  const topServices = await db.service.findMany({
    orderBy: { salesCount: "desc" },
    take: 2,
    select: { slug: true, title: true, basePrice: true, deliveryDays: true },
  });

  const serviceLines = topServices
    .map(
      (s) =>
        `- [**${sanitizeNoEmDash(s.title)}** (${s.basePrice} EUR, livraison ${s.deliveryDays} j)](${siteUrl}/services/${s.slug}?utm_source=devto&utm_medium=syndication)`,
    )
    .join("\n");

  const absolutizedBody = sanitizeNoEmDash(post.content)
    .replace(/\]\(\/services\//g, `](${siteUrl}/services/`)
    .replace(/\]\(\/categories\//g, `](${siteUrl}/categories/`)
    .replace(/\]\(\/blog\//g, `](${siteUrl}/blog/`)
    .replace(/\]\(\/support/g, `](${siteUrl}/support`);

  const ctaFooter = [
    "",
    "---",
    "",
    "## Passer à l'action dès aujourd'hui avec b2bpro.store",
    "",
    "Vous souhaitez déléguer cette exécution à un expert francophone vérifié (paiement séquestré jusqu'à votre validation) ?",
    "",
    serviceLines,
    "",
    `Une question avant de commander ? [Contacter directement le support b2bpro.store](${siteUrl}/support?utm_source=devto)`,
    "",
    `*Article original publié sur [b2bpro.store](${canonicalUrl}).*`,
  ].join("\n");

  const bodyMarkdown = `${absolutizedBody}\n${ctaFooter}`;
  const tags = sanitizeDevtoTags(
    CATEGORY_TO_DEVTO_TAGS[post.category] ?? ["b2b", "ai", "seo", "growth"],
  );

  if (params.dryRun) {
    return {
      record: {
        id: `dry-${post.slug}`,
        platform: "devto",
        blogSlug: post.slug,
        title: sanitizeNoEmDash(post.title),
        externalUrl: `https://dev.to/iglobal71/${post.slug}-preview`,
        externalId: "dry-run",
        canonicalUrl,
        publishedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "b2bpro-engine/1.0 (+https://b2bpro.store)",
      },
      body: JSON.stringify({
        article: {
          title: sanitizeNoEmDash(post.title),
          body_markdown: bodyMarkdown,
          published: true,
          canonical_url: canonicalUrl,
          tags,
          main_image: coverUrl,
          description: sanitizeNoEmDash(post.excerpt).slice(0, 155),
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { record: null, error: `Dev.to HTTP ${res.status}: ${errText.slice(0, 180)}` };
    }

    const created = (await res.json()) as { id?: number; url?: string };
    return {
      record: {
        id: `devto-${created.id ?? Date.now()}`,
        platform: "devto",
        blogSlug: post.slug,
        title: sanitizeNoEmDash(post.title),
        externalUrl: created.url || `https://dev.to/iglobal71`,
        externalId: String(created.id ?? ""),
        canonicalUrl,
        publishedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return {
      record: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function generateDailySocialKit(): Promise<SocialKitPost[]> {
  const siteUrl = getSiteUrl();
  const services = await db.service.findMany({
    orderBy: { salesCount: "desc" },
    take: 25,
    select: { slug: true, title: true, shortDesc: true, basePrice: true, deliveryDays: true, poleSlug: true },
  });

  if (services.length === 0) return [];
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const pick = services[daySeed % services.length]!;
  const second = services[(daySeed + 3) % services.length]!;

  const svcUrl = `${siteUrl}/services/${pick.slug}?utm_source=social`;
  const supportUrl = `${siteUrl}/support?utm_source=social`;
  const nowIso = new Date().toISOString();

  return [
    {
      id: `kit-li-${daySeed}`,
      channel: "linkedin",
      label: "Post LinkedIn B2B (Étude & Offre)",
      serviceSlug: pick.slug,
      serviceTitle: sanitizeNoEmDash(pick.title),
      generatedAt: nowIso,
      content: sanitizeNoEmDash(
        [
          `La plupart des PME perdent des clients B2B avant même le premier appel parce que leurs données commerciales ou leur visibilité IA sont incomplètes.`,
          ``,
          `Chez b2bpro.store, nos spécialistes francophones débloquent ce point précis en ${pick.deliveryDays} jours ouvrés dès ${pick.basePrice} € :`,
          `-> ${pick.title}`,
          `${pick.shortDesc}`,
          ``,
          `Paiement sécurisé sous séquestre : vous ne validez le règlement qu'une fois le livrable vérifié.`,
          ``,
          `Découvrir la fiche complète : ${svcUrl}`,
          `Poser une question à notre support : ${supportUrl}`,
        ].join("\n"),
      ),
    },
    {
      id: `kit-x-${daySeed}`,
      channel: "x",
      label: "Post X / Bluesky (Court)",
      serviceSlug: pick.slug,
      serviceTitle: sanitizeNoEmDash(pick.title),
      generatedAt: nowIso,
      content: sanitizeNoEmDash(
        `${pick.title} en ${pick.deliveryDays} jours dès ${pick.basePrice} € (paiement sous séquestre après validation). Voir l'offre : ${svcUrl} | Question ? ${supportUrl}`,
      ),
    },
    {
      id: `kit-fb-${daySeed}`,
      channel: "facebook",
      label: "Message Groupes Entrepreneurs Facebook",
      serviceSlug: second.slug,
      serviceTitle: sanitizeNoEmDash(second.title),
      generatedAt: nowIso,
      content: sanitizeNoEmDash(
        [
          `Bonjour à tous les dirigeants et freelances du groupe !`,
          `Si vous cherchez à gagner du temps cette semaine sans recruter en interne, voici une prestation clé en main à ${second.basePrice} € livrée en ${second.deliveryDays} jours sur b2bpro.store :`,
          `"${second.title}"`,
          ``,
          `Les fonds restent bloqués sous séquestre jusqu'à votre validation du travail.`,
          `Voir le détail : ${siteUrl}/services/${second.slug}?utm_source=facebook`,
          `Ou parlez directement à notre support : ${supportUrl}`,
        ].join("\n"),
      ),
    },
    {
      id: `kit-wa-${daySeed}`,
      channel: "whatsapp",
      label: "Message Direct WhatsApp / Réseau",
      serviceSlug: pick.slug,
      serviceTitle: sanitizeNoEmDash(pick.title),
      generatedAt: nowIso,
      content: sanitizeNoEmDash(
        `Bonjour ! Je vous partage cette fiche sur b2bpro.store (${pick.title}, ${pick.basePrice} €, livré en ${pick.deliveryDays} j avec paiement protégé sous séquestre) : ${svcUrl}. Vous pouvez aussi poser vos questions ici : ${supportUrl}`,
      ),
    },
  ];
}
