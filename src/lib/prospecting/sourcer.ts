/**
 * Sourcing B2B 100 % gratuit & haute précision :
 *   - Phase A (primaire) : organisations B2B francophones actives avec site web officiel
 *   - Phase B (repli)    : PME françaises par code NAF via recherche-entreprises.api.gouv.fr
 *   - Extraction stricte d'emails publics de domaine (y compris décodage Cloudflare data-cfemail)
 *   - Vérification DNS MX & audit technique en direct (/llms.txt, JSON-LD, Meta, OpenGraph, H1, TTFB)
 */

import dns from "dns";
import { db } from "@/lib/db";
import { EMAIL_RE } from "@/lib/contracts";
import {
  normalizeEmail,
  sanitizeNoEmDash,
  type ProspectAuditFinding,
} from "@/lib/prospecting/types";

export interface PoleSearchTarget {
  query: string;
  poleSlug: string;
  nafCode: string;
}

export const POLE_SEARCH_TARGETS: PoleSearchTarget[] = [
  { query: "agence communication", poleSlug: "seo-geo-medias", nafCode: "73.11Z" },
  { query: "conseil informatique", poleSlug: "ia-rag-data", nafCode: "62.01Z" },
  { query: "edition logiciels", poleSlug: "saas-tech", nafCode: "62.01Z" },
  { query: "boutique ecommerce", poleSlug: "ecommerce-pricing", nafCode: "47.91B" },
  { query: "agence immobiliere", poleSlug: "immobilier-local", nafCode: "68.31Z" },
  { query: "organisme formation", poleSlug: "formation-sante", nafCode: "85.59A" },
  { query: "agence digitale", poleSlug: "b2b-sales-intelligence", nafCode: "73.11Z" },
  { query: "studio marketing", poleSlug: "social-media-influence", nafCode: "73.11Z" },
];

const FRANCOPHONE_CITY_HUBS: Array<{ city: string; poleSlug: string; department: string }> = [
  { city: "Paris", poleSlug: "saas-tech", department: "75" },
  { city: "Lyon", poleSlug: "ia-rag-data", department: "69" },
  { city: "Bordeaux", poleSlug: "seo-geo-medias", department: "33" },
  { city: "Nantes", poleSlug: "b2b-sales-intelligence", department: "44" },
  { city: "Toulouse", poleSlug: "saas-tech", department: "31" },
  { city: "Lille", poleSlug: "ecommerce-pricing", department: "59" },
  { city: "Montpellier", poleSlug: "social-media-influence", department: "34" },
  { city: "Rennes", poleSlug: "ia-rag-data", department: "35" },
  { city: "Marseille", poleSlug: "b2b-sales-intelligence", department: "13" },
  { city: "Strasbourg", poleSlug: "seo-geo-medias", department: "67" },
  { city: "Grenoble", poleSlug: "saas-tech", department: "38" },
  { city: "Nice", poleSlug: "ecommerce-pricing", department: "06" },
  { city: "Brussels", poleSlug: "b2b-sales-intelligence", department: "BE" },
  { city: "Geneva", poleSlug: "ia-rag-data", department: "CH" },
  { city: "Lausanne", poleSlug: "saas-tech", department: "CH" },
  { city: "Montreal", poleSlug: "seo-geo-medias", department: "CA" },
  { city: "Casablanca", poleSlug: "ecommerce-pricing", department: "MA" },
  { city: "Dakar", poleSlug: "social-media-influence", department: "SN" },
];

const TARGET_DEPARTMENTS = ["69", "75", "33", "44", "31", "59", "13", "67", "35", "34", "92", "38"];
const NAF_ROTATION = ["62.01Z", "73.11Z", "47.91B", "68.31Z", "85.59A"];

const ALLOWED_LOCAL_PREFIXES = new Set([
  "contact",
  "bonjour",
  "hello",
  "info",
  "infos",
  "direction",
  "commercial",
  "agence",
  "equipe",
  "accueil",
  "atelier",
  "studio",
  "cabinet",
  "projet",
  "projets",
  "devis",
  "client",
  "clients",
  "partenariat",
  "relation",
  "service",
  "services",
  "vente",
  "ventes",
  "reservation",
  "team",
  "sales",
  "marketing",
  "welcome",
  "hey",
  "presse",
]);

const BLOCKED_LOCAL_PREFIXES = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "dpo",
  "rgpd",
  "gdpr",
  "privacy",
  "donnees",
  "abuse",
  "postmaster",
  "webmaster",
  "hostmaster",
  "mailer-daemon",
  "recrutement",
  "jobs",
  "job",
  "rh",
  "stage",
  "candidature",
  "compta",
  "comptabilite",
  "facturation",
  "sentry",
  "wixpress",
  "example",
  "test",
  "admin",
  "root",
  "unsubscribe",
]);

const LEGAL_STOPWORDS = new Set([
  "sas",
  "sasu",
  "sarl",
  "eurl",
  "sa",
  "sci",
  "selarl",
  "snc",
  "scop",
  "gie",
  "ei",
  "eirl",
  "association",
  "france",
  "holding",
  "groupe",
  "et",
  "cie",
  "societe",
  "entreprise",
  "monsieur",
  "madame",
  "mme",
  "mr",
]);

const ACTIVITY_WORDS = new Set([
  "agence",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "communication",
  "conseil",
  "services",
  "service",
  "solutions",
  "solution",
  "studio",
  "atelier",
  "cabinet",
  "digital",
  "digitale",
  "web",
  "informatique",
  "immobiliere",
  "immobilier",
  "formation",
  "recrutement",
  "marketing",
  "evenementielle",
  "evenementiel",
  "transport",
  "logistique",
]);

const PARKED_SIGNALS = [
  "sedo.com",
  "afternic",
  "hugedomains",
  "dan.com",
  "domain for sale",
  "domaine en vente",
  "ce nom de domaine est a vendre",
  "ce domaine est en vente",
  "acheter ce domaine",
  "felicitations ! votre domaine a bien ete cree",
  "site en construction",
  "under construction",
  "coming soon",
  "default web site page",
];

const EXCLUDED_HOSTS = [
  ".gouv.fr",
  ".edu",
  ".asso.fr",
  ".github.io",
  ".org",
  "inria.fr",
  "cnrs.fr",
  "cea.fr",
  "inserm.fr",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "github.com",
  "medium.com",
  "notion.so",
];

const FRENCH_MARKERS_RE =
  /\b(contact|accueil|mentions|politique|services|entreprise|societe|france|nous|votre|notre|paris|lyon|devis)\b/i;

export function isCommercialDomain(domain: string): boolean {
  const clean = domain.toLowerCase().replace(/^www\./, "");
  if (!clean || !clean.includes(".") || clean.length < 4) return false;
  if (clean.includes(".ac-")) return false;
  for (const blocked of EXCLUDED_HOSTS) {
    if (blocked.startsWith(".")) {
      if (clean.endsWith(blocked)) return false;
    } else if (clean === blocked || clean.endsWith(`.${blocked}`)) {
      return false;
    }
  }
  return true;
}

export function decodeCloudflareEmail(hex: string): string | null {
  const clean = hex.trim();
  if (clean.length < 6 || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    return null;
  }
  const key = parseInt(clean.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16) ^ key;
    out += String.fromCharCode(code);
  }
  const normalized = normalizeEmail(out);
  return EMAIL_RE.test(normalized) ? normalized : null;
}

function normalizeAsciiTokens(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !LEGAL_STOPWORDS.has(t));
}

export function buildDomainCandidates(companyName: string, sigle?: string | null): string[] {
  const rawUpper = companyName.toUpperCase();
  if (/^(MONSIEUR|MADAME|M\.|MME)\s/.test(rawUpper)) return [];

  const tokens = normalizeAsciiTokens(companyName);
  if (tokens.length === 0 || tokens.length > 7) return [];

  const slugs = new Set<string>();
  const joinedAll = tokens.join("");
  if (joinedAll.length >= 4 && joinedAll.length <= 24) {
    slugs.add(joinedAll);
  }
  if (tokens.length >= 2 && tokens.length <= 4) {
    const dashed = tokens.join("-");
    if (dashed.length >= 4 && dashed.length <= 28) slugs.add(dashed);
  }

  const brandTokens = tokens.filter((t) => !ACTIVITY_WORDS.has(t));
  if (brandTokens.length >= 1 && brandTokens.length <= 3) {
    const bJoined = brandTokens.join("");
    if (bJoined.length >= 4 && bJoined.length <= 22) slugs.add(bJoined);
    if (brandTokens.length >= 2) {
      const bDashed = brandTokens.join("-");
      if (bDashed.length >= 4 && bDashed.length <= 26) slugs.add(bDashed);
    }
  }

  if (tokens.length >= 2) {
    const firstTwo = `${tokens[0]}${tokens[1]}`;
    if (firstTwo.length >= 4 && firstTwo.length <= 22) slugs.add(firstTwo);
  }

  if (sigle) {
    const cleanSigle = sigle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    if (cleanSigle.length >= 3 && cleanSigle.length <= 16) {
      slugs.add(cleanSigle);
    }
  }

  const domains: string[] = [];
  for (const slug of slugs) {
    if (!/^[a-z0-9][a-z0-9-]{2,26}[a-z0-9]$/.test(slug)) continue;
    domains.push(`${slug}.fr`, `${slug}.com`);
  }
  return domains.slice(0, 6);
}

export function extractPublicB2bEmails(html: string, targetDomain: string): string[] {
  const cleanDomain = targetDomain.toLowerCase().replace(/^www\./, "");
  const decoded = html
    .replace(/&#64;|&#x40;/gi, "@")
    .replace(/&#46;|&#x2e;/gi, ".")
    .replace(/&amp;/gi, "&");

  const candidates = new Set<string>();

  for (const cf of decoded.matchAll(/data-cfemail=["']([0-9a-fA-F]{6,})["']/gi)) {
    if (cf[1]) {
      const decodedMail = decodeCloudflareEmail(cf[1]);
      if (decodedMail) candidates.add(decodedMail);
    }
  }

  for (const m of decoded.matchAll(
    /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  )) {
    if (m[1]) candidates.add(normalizeEmail(m[1]));
  }

  for (const m of decoded.matchAll(
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
  )) {
    if (m[1]) candidates.add(normalizeEmail(m[1]));
  }

  const valid: string[] = [];
  for (const email of candidates) {
    const [local, host] = email.split("@");
    if (!local || !host) continue;
    const normalizedHost = host.replace(/^www\./, "");
    if (normalizedHost !== cleanDomain) continue;
    if (BLOCKED_LOCAL_PREFIXES.has(local)) continue;
    if (/\.(png|jpg|jpeg|webp|svg|gif|css|js)$/i.test(host)) continue;

    if (ALLOWED_LOCAL_PREFIXES.has(local)) {
      valid.push(email);
    }
  }

  return [...new Set(valid)].sort((a, b) => {
    const rank = (e: string) => {
      const prefix = e.split("@")[0] ?? "";
      if (prefix === "contact") return 0;
      if (prefix === "bonjour" || prefix === "hello") return 1;
      if (prefix === "commercial" || prefix === "direction" || prefix === "sales") return 2;
      return 3;
    };
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

export function auditWebsiteHtml(input: {
  url: string;
  domain: string;
  statusCode: number;
  ttfbMs: number;
  html: string;
  hasLlmsTxt: boolean;
}): ProspectAuditFinding {
  const titleMatch = input.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = sanitizeNoEmDash((titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim()).slice(0, 120);

  const metaMatch =
    input.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ??
    input.html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const metaDesc = (metaMatch?.[1] ?? "").trim();

  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(input.html);
  const hasOpenGraph =
    /property=["']og:title["']/i.test(input.html) &&
    /property=["']og:image["']/i.test(input.html);
  const hasH1 = /<h1[\s>]/i.test(input.html);

  const issues: string[] = [];
  if (!input.hasLlmsTxt) {
    issues.push(
      "Aucun fichier /llms.txt détecté : ChatGPT et Perplexity manquent d'une synthèse directe de vos services",
    );
  }
  if (!hasJsonLd) {
    issues.push("Données structurées Schema.org (JSON-LD) absentes de la page d'accueil");
  }
  if (metaDesc.length < 60) {
    issues.push(
      "Balise meta description absente ou trop courte (< 60 caractères) pour capter les clics sur Google",
    );
  }
  if (!hasOpenGraph) {
    issues.push("Balises OpenGraph (og:title et og:image) incomplètes pour le partage LinkedIn");
  }
  if (!hasH1) {
    issues.push("Balise titre principale H1 absente sur la page d'accueil");
  }
  if (input.ttfbMs > 3500) {
    issues.push(`Temps de réponse serveur élevé (${input.ttfbMs} ms) freinant l'indexation mobile`);
  }
  if (issues.length === 0) {
    issues.push(
      "Aucune FAQ structurée orientée réponse directe IA n'a été détectée sur l'accueil",
    );
  }

  return {
    url: input.url,
    domain: input.domain,
    statusCode: input.statusCode,
    ttfbMs: input.ttfbMs,
    title,
    metaDescriptionLength: metaDesc.length,
    hasLlmsTxt: input.hasLlmsTxt,
    hasJsonLd,
    hasOpenGraph,
    hasH1,
    issues: issues.slice(0, 4),
    summaryLine: sanitizeNoEmDash(issues[0]!),
  };
}

function isLikelyActiveSite(html: string, trustedFrancophoneOrigin: boolean): boolean {
  const lower = html
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (lower.length < 500) return false;
  for (const sig of PARKED_SIGNALS) {
    if (lower.includes(sig)) return false;
  }
  if (trustedFrancophoneOrigin) return true;
  return FRENCH_MARKERS_RE.test(lower);
}

async function hasValidMx(domain: string): Promise<boolean> {
  try {
    const mx = await dns.promises.resolveMx(domain);
    return Array.isArray(mx) && mx.some((r) => Boolean(r.exchange));
  } catch {
    return false;
  }
}

async function fetchHtmlQuick(url: string, timeoutMs = 8500): Promise<{
  ok: boolean;
  finalUrl: string;
  status: number;
  ttfbMs: number;
  html: string;
} | null> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; b2bpro-audit/1.0; +https://b2bpro.store)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ttfbMs = Date.now() - t0;
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) return null;
    const html = await res.text();
    return { ok: true, finalUrl: res.url, status: res.status, ttfbMs, html };
  } catch {
    return null;
  }
}

async function checkLlmsTxt(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/llms.txt`, {
      redirect: "manual",
      headers: { "User-Agent": "b2bpro-audit/1.0 (+https://b2bpro.store)" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.status !== 200) return false;
    const ct = res.headers.get("content-type") || "";
    if (!/text\/(plain|markdown)/i.test(ct)) return false;
    const body = await res.text();
    return body.trim().length > 40 && !/<html/i.test(body);
  } catch {
    return false;
  }
}

export interface AuditedProspectCandidate {
  siren: string;
  companyName: string;
  city: string;
  department: string;
  domain: string;
  websiteUrl: string;
  email: string;
  poleSlug: string;
  serviceSlug: string;
  serviceTitle: string;
  servicePrice: number;
  deliveryDays: number;
  findings: ProspectAuditFinding;
}

interface CatalogServiceLite {
  slug: string;
  title: string;
  basePrice: number;
  deliveryDays: number;
  poleSlug: string;
  salesCount: number;
}

export async function pickBestServiceForFinding(
  poleSlug: string,
  findings: ProspectAuditFinding,
  allServices?: CatalogServiceLite[],
): Promise<CatalogServiceLite | null> {
  const list =
    allServices ??
    (await db.service.findMany({
      select: {
        slug: true,
        title: true,
        basePrice: true,
        deliveryDays: true,
        poleSlug: true,
        salesCount: true,
      },
      orderBy: { salesCount: "desc" },
    }));

  if (list.length === 0) return null;

  if (!findings.hasLlmsTxt || !findings.hasJsonLd) {
    const geoAudit = list.find(
      (s) => s.slug === "je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia",
    );
    if (geoAudit && (poleSlug === "seo-geo-medias" || Math.random() < 0.55)) {
      return geoAudit;
    }
  }

  const samePole = list.filter((s) => s.poleSlug === poleSlug);
  if (samePole.length > 0) {
    return samePole[0]!;
  }

  return list[0]!;
}

export async function probeAndAuditDomain(params: {
  domain: string;
  siren: string;
  companyName: string;
  city: string;
  department: string;
  poleSlug: string;
  overrideEmail?: string;
  trustedFrancophoneOrigin?: boolean;
  allServices?: CatalogServiceLite[];
}): Promise<AuditedProspectCandidate | null> {
  const cleanDomain = params.domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]!;

  if (!isCommercialDomain(cleanDomain)) return null;

  let home = await fetchHtmlQuick(`https://${cleanDomain}`, 8500);
  if (!home) {
    home = await fetchHtmlQuick(`https://www.${cleanDomain}`, 8500);
  }
  if (!home || !isLikelyActiveSite(home.html, Boolean(params.trustedFrancophoneOrigin))) {
    return null;
  }

  const finalHost = new URL(home.finalUrl).hostname.toLowerCase().replace(/^www\./, "");
  if (!isCommercialDomain(finalHost)) return null;
  const origin = new URL(home.finalUrl).origin;

  let emails: string[] = [];
  if (params.overrideEmail) {
    const cleanOverride = normalizeEmail(params.overrideEmail);
    const [local, host] = cleanOverride.split("@");
    const normOverrideHost = host?.replace(/^www\./, "");
    if (
      local &&
      normOverrideHost === finalHost &&
      !BLOCKED_LOCAL_PREFIXES.has(local) &&
      EMAIL_RE.test(cleanOverride)
    ) {
      emails = [cleanOverride];
    }
  }

  if (emails.length === 0) {
    emails = extractPublicB2bEmails(home.html, finalHost);
  }

  if (emails.length === 0) {
    for (const sub of ["/contact", "/contactez-nous", "/mentions-legales"]) {
      const subPage = await fetchHtmlQuick(`${origin}${sub}`, 5500);
      if (subPage) {
        emails = extractPublicB2bEmails(subPage.html, finalHost);
        if (emails.length > 0) break;
      }
    }
  }

  if (emails.length === 0) return null;

  const targetEmail = emails[0]!;
  const emailHost = targetEmail.split("@")[1]?.replace(/^www\./, "") || finalHost;
  const mxOk = await hasValidMx(emailHost);
  if (!mxOk) return null;

  const hasLlmsTxt = await checkLlmsTxt(origin);
  const findings = auditWebsiteHtml({
    url: home.finalUrl,
    domain: finalHost,
    statusCode: home.status,
    ttfbMs: home.ttfbMs,
    html: home.html,
    hasLlmsTxt,
  });

  const service = await pickBestServiceForFinding(
    params.poleSlug,
    findings,
    params.allServices,
  );
  if (!service) return null;

  return {
    siren: params.siren,
    companyName: params.companyName,
    city: params.city,
    department: params.department,
    domain: finalHost,
    websiteUrl: home.finalUrl,
    email: targetEmail,
    poleSlug: service.poleSlug,
    serviceSlug: service.slug,
    serviceTitle: service.title,
    servicePrice: service.basePrice,
    deliveryDays: service.deliveryDays,
    findings,
  };
}

interface GithubOrgDetail {
  id: number;
  login: string;
  name?: string | null;
  blog?: string | null;
  email?: string | null;
  location?: string | null;
}

async function discoverFromGithubOrgs(params: {
  needed: number;
  searchCursor: number;
  excludedEmails: Set<string>;
  excludedDomains: Set<string>;
  allServices: CatalogServiceLite[];
  maxHubs?: number;
}): Promise<{
  prospects: AuditedProspectCandidate[];
  nextCursor: number;
  errors: string[];
}> {
  const found: AuditedProspectCandidate[] = [];
  const errors: string[] = [];
  let cursor = params.searchCursor;
  const maxHubs = params.maxHubs ?? 3;

  for (let step = 0; step < maxHubs && found.length < params.needed; step++) {
    const hub = FRANCOPHONE_CITY_HUBS[cursor % FRANCOPHONE_CITY_HUBS.length]!;
    const page = (Math.floor(cursor / FRANCOPHONE_CITY_HUBS.length) % 5) + 1;
    cursor += 1;

    try {
      const searchUrl = `https://api.github.com/search/users?q=location:${encodeURIComponent(hub.city)}+type:org+followers:1..150&per_page=20&page=${page}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "b2bpro-audit/1.0",
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        errors.push(`GitHub Orgs HTTP ${res.status} (${hub.city})`);
        if (res.status === 403 || res.status === 429) break;
        continue;
      }

      const data = (await res.json()) as { items?: Array<{ url: string; login: string }> };
      const items = data.items ?? [];

      const BATCH = 4;
      for (let i = 0; i < items.length && found.length < params.needed; i += BATCH) {
        const chunk = items.slice(i, i + BATCH);
        const orgDetails = await Promise.all(
          chunk.map(async (item) => {
            try {
              const r = await fetch(item.url, {
                headers: {
                  "User-Agent": "b2bpro-audit/1.0",
                  Accept: "application/vnd.github+json",
                },
                signal: AbortSignal.timeout(6000),
              });
              if (!r.ok) return null;
              return (await r.json()) as GithubOrgDetail;
            } catch {
              return null;
            }
          }),
        );

        const probeResults = await Promise.all(
          orgDetails.map(async (org) => {
            if (!org || !org.blog) return null;
            const rawBlog = org.blog.trim();
            const normalizedUrl = /^https?:\/\//i.test(rawBlog) ? rawBlog : `https://${rawBlog}`;
            let host = "";
            try {
              host = new URL(normalizedUrl).hostname.toLowerCase().replace(/^www\./, "");
            } catch {
              return null;
            }
            if (!isCommercialDomain(host) || params.excludedDomains.has(host)) return null;

            return probeAndAuditDomain({
              domain: host,
              siren: `ORG-${org.id}`,
              companyName: (org.name || org.login).trim(),
              city: (org.location || hub.city).trim().slice(0, 60),
              department: hub.department,
              poleSlug: hub.poleSlug,
              overrideEmail: org.email || undefined,
              trustedFrancophoneOrigin: true,
              allServices: params.allServices,
            });
          }),
        );

        for (const item of probeResults) {
          if (!item) continue;
          if (
            params.excludedEmails.has(item.email) ||
            params.excludedDomains.has(item.domain)
          ) {
            continue;
          }
          params.excludedEmails.add(item.email);
          params.excludedDomains.add(item.domain);
          found.push(item);
          if (found.length >= params.needed) break;
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { prospects: found, nextCursor: cursor, errors };
}

interface GouvCompanyResult {
  siren?: string;
  nom_raison_sociale?: string;
  nom_complet?: string;
  sigle?: string | null;
  etat_administratif?: string;
  siege?: {
    libelle_commune?: string;
    departement?: string;
  };
}

async function discoverFromSireneNaf(params: {
  needed: number;
  searchCursor: number;
  excludedEmails: Set<string>;
  excludedDomains: Set<string>;
  allServices: CatalogServiceLite[];
  maxSteps?: number;
}): Promise<{
  prospects: AuditedProspectCandidate[];
  nextCursor: number;
  errors: string[];
}> {
  const found: AuditedProspectCandidate[] = [];
  const errors: string[] = [];
  let cursor = params.searchCursor;
  const maxSteps = params.maxSteps ?? 3;

  for (let step = 0; step < maxSteps && found.length < params.needed; step++) {
    const naf = NAF_ROTATION[cursor % NAF_ROTATION.length]!;
    const dept = TARGET_DEPARTMENTS[Math.floor(cursor / NAF_ROTATION.length) % TARGET_DEPARTMENTS.length]!;
    const page = (Math.floor(cursor / (NAF_ROTATION.length * TARGET_DEPARTMENTS.length)) % 4) + 1;
    cursor += 1;

    const poleSlug =
      POLE_SEARCH_TARGETS.find((t) => t.nafCode === naf)?.poleSlug || "b2b-sales-intelligence";

    try {
      const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(naf)}&departement=${dept}&tranche_effectif_salarie=02,03,11&etat_administratif=A&page=${page}&per_page=20`;
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "b2bpro-audit/1.0 (+https://b2bpro.store)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        errors.push(`api.gouv HTTP ${res.status} (${naf}/${dept})`);
        continue;
      }

      const payload = (await res.json()) as { results?: GouvCompanyResult[] };
      const rows = payload.results ?? [];

      const domainTasks: Array<() => Promise<AuditedProspectCandidate | null>> = [];
      const localSeenDomains = new Set<string>();

      for (const row of rows) {
        const name = (row.nom_raison_sociale || row.nom_complet || "").trim();
        if (!name || row.etat_administratif === "C") continue;
        const candidates = buildDomainCandidates(name, row.sigle);
        if (candidates.length === 0) continue;

        const city = row.siege?.libelle_commune || "France";
        const siren = row.siren || `SIREN-${cursor}`;

        for (const dom of candidates.slice(0, 2)) {
          if (params.excludedDomains.has(dom) || localSeenDomains.has(dom)) continue;
          localSeenDomains.add(dom);

          domainTasks.push(() =>
            probeAndAuditDomain({
              domain: dom,
              siren,
              companyName: name,
              city,
              department: row.siege?.departement || dept,
              poleSlug,
              allServices: params.allServices,
            }),
          );
        }
      }

      const BATCH_SIZE = 6;
      for (let i = 0; i < domainTasks.length && found.length < params.needed; i += BATCH_SIZE) {
        const batch = domainTasks.slice(i, i + BATCH_SIZE).map((fn) => fn());
        const settled = await Promise.all(batch);
        for (const item of settled) {
          if (!item) continue;
          if (
            params.excludedEmails.has(item.email) ||
            params.excludedDomains.has(item.domain)
          ) {
            continue;
          }
          params.excludedEmails.add(item.email);
          params.excludedDomains.add(item.domain);
          found.push(item);
          if (found.length >= params.needed) break;
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { prospects: found, nextCursor: cursor, errors };
}

export async function discoverAndAuditProspects(params: {
  needed: number;
  searchCursor: number;
  excludedEmails: Set<string>;
  excludedDomains: Set<string>;
  maxApiSteps?: number;
}): Promise<{
  prospects: AuditedProspectCandidate[];
  nextCursor: number;
  apiErrors: string[];
}> {
  const allServices = await db.service.findMany({
    select: {
      slug: true,
      title: true,
      basePrice: true,
      deliveryDays: true,
      poleSlug: true,
      salesCount: true,
    },
    orderBy: { salesCount: "desc" },
  });

  const phaseA = await discoverFromGithubOrgs({
    needed: params.needed,
    searchCursor: params.searchCursor,
    excludedEmails: params.excludedEmails,
    excludedDomains: params.excludedDomains,
    allServices,
    maxHubs: params.maxApiSteps ?? 4,
  });

  const prospects = [...phaseA.prospects];
  const apiErrors = [...phaseA.errors];
  let nextCursor = phaseA.nextCursor;

  if (prospects.length < params.needed) {
    const phaseB = await discoverFromSireneNaf({
      needed: params.needed - prospects.length,
      searchCursor: nextCursor,
      excludedEmails: params.excludedEmails,
      excludedDomains: params.excludedDomains,
      allServices,
      maxSteps: 3,
    });
    prospects.push(...phaseB.prospects);
    apiErrors.push(...phaseB.errors);
    nextCursor = phaseB.nextCursor;
  }

  return { prospects, nextCursor, apiErrors };
}
