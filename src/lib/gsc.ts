/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE GOOGLE SEARCH CONSOLE & INDEXATION UNIFIÉE — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Assure la soumission automatique, la notification et l'inspection de tout
 *  contenu nouveau ou modifié (articles de blog, fiches de services/produits) :
 *
 *   1. Re-soumission dynamique du Sitemap à Google Search Console (Search Console API)
 *   2. Audit d'état & déclenchement de découverte via l'API URL Inspection GSC
 *   3. Notification instantanée multi-moteurs via le protocole universel IndexNow
 *   4. Traçabilité complète (journal d'indexation JSON Lines + file quotidienne)
 *
 *  Source des identifiants (OAuth2 siteOwner) :
 *   - Variable d'environnement GSC_TOKEN_JSON (Vercel / Cloud)
 *   - Fichier local gitignoré ./gsc-token.json
 *   - Répertoire partagé central Blogger: C:\Users\Administrateur\Documents\project\Blogger\token_gsc.json
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import path from "path";
import { getSiteUrl } from "@/lib/env";

export const GSC_DEFAULT_PROPERTY = "https://b2bpro.store/";
export const GSC_WWW_PROPERTY = "https://www.b2bpro.store/";
export const GSC_ALL_PROPERTIES = [GSC_DEFAULT_PROPERTY, GSC_WWW_PROPERTY];

export const INDEXNOW_KEY = "c76eea801c4640ccb314bd5c0d48767b";
export const INDEXNOW_KEY_LOCATION = "https://b2bpro.store/c76eea801c4640ccb314bd5c0d48767b.txt";
export const INDEXNOW_HOST = "b2bpro.store";
export const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

const CENTRAL_BLOGGER_TOKEN_PATH =
  process.env.CENTRAL_GSC_TOKEN_PATH || path.join(process.cwd(), "..", "Blogger", "token_gsc.json");

export interface GscCredentials {
  token?: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  token_uri?: string;
  scopes?: string[];
  expiry?: string;
}

export interface GscInspectionDetails {
  verdict: string;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  inspectionResultLink?: string;
}

export interface GscInspectionResponse {
  ok: boolean;
  url: string;
  verdict?: string;
  details?: GscInspectionDetails;
  error?: string;
  status?: number;
}

export interface GscSitemapSubmissionResponse {
  property: string;
  sitemapUrl: string;
  ok: boolean;
  status: number;
  error?: string;
}

export interface IndexNowResponse {
  ok: boolean;
  endpoints: Array<{ endpoint: string; status?: number; error?: string }>;
}

export interface ContentSubmissionOptions {
  type: "blog" | "service" | "general";
  slug?: string;
  url?: string;
  title?: string;
  silent?: boolean;
}

export interface ContentSubmissionResult {
  ok: boolean;
  url: string;
  title?: string;
  type: "blog" | "service" | "general";
  timestamp: string;
  sitemaps: GscSitemapSubmissionResponse[];
  inspection?: GscInspectionResponse;
  indexnow: IndexNowResponse;
  error?: string;
}

// Cache mémoire du token d'accès
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Charge les identifiants OAuth2 Google Search Console.
 * Tolérant : tente l'environnement, le fichier local, puis la synchronisation avec le projet Blogger.
 */
export function loadGscCredentials(): GscCredentials | null {
  // 1. Variable d'environnement
  if (process.env.GSC_TOKEN_JSON) {
    try {
      return JSON.parse(process.env.GSC_TOKEN_JSON) as GscCredentials;
    } catch (e) {
      console.warn("⚠️ [GSC] Impossible d'analyser la variable GSC_TOKEN_JSON");
    }
  }

  // 2. Fichier local ./gsc-token.json
  const localPath = path.join(process.cwd(), "gsc-token.json");
  if (existsSync(localPath)) {
    try {
      return JSON.parse(readFileSync(localPath, "utf8")) as GscCredentials;
    } catch (e) {
      console.warn(`⚠️ [GSC] Erreur lors de la lecture de ${localPath}`);
    }
  }

  // 3. Fallback sur le projet Blogger central
  if (existsSync(CENTRAL_BLOGGER_TOKEN_PATH)) {
    try {
      const raw = readFileSync(CENTRAL_BLOGGER_TOKEN_PATH, "utf8");
      // Sauvegarde locale automatique pour les prochains lancements
      try {
        writeFileSync(localPath, raw, "utf8");
      } catch {
        // En lecture seule (ex: Vercel serverless), pas grave
      }
      return JSON.parse(raw) as GscCredentials;
    } catch (e) {
      console.warn(`⚠️ [GSC] Erreur de lecture du token central Blogger :`, e);
    }
  }

  return null;
}

/**
 * Obtient un jeton d'accès OAuth2 valide auprès de Google en utilisant le refresh_token.
 */
export async function getGscAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }

  const creds = loadGscCredentials();
  if (!creds || !creds.refresh_token || !creds.client_id || !creds.client_secret) {
    return null;
  }

  try {
    const tokenEndpoint = creds.token_uri || "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    });

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const errTxt = await res.text();
      console.warn(`⚠️ [GSC] Échec du rafraîchissement OAuth Google (${res.status}): ${errTxt}`);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return cachedAccessToken.token;
  } catch (err) {
    console.warn("⚠️ [GSC] Erreur réseau lors de la récupération du token Google :", err);
    return null;
  }
}

/**
 * Soumet le Sitemap à Google Search Console pour demander un ré-examen du site.
 */
export async function submitSitemapToGSC(
  propertyUrl: string = GSC_DEFAULT_PROPERTY,
  sitemapUrl?: string
): Promise<GscSitemapSubmissionResponse> {
  const isWww = propertyUrl.includes("www.");
  const targetSitemap =
    sitemapUrl ||
    (isWww ? "https://www.b2bpro.store/sitemap.xml" : "https://b2bpro.store/sitemap.xml");

  const token = await getGscAccessToken();
  if (!token) {
    return {
      property: propertyUrl,
      sitemapUrl: targetSitemap,
      ok: false,
      status: 401,
      error: "Identifiants Google Search Console indisponibles ou invalides",
    };
  }

  try {
    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      propertyUrl
    )}/sitemaps/${encodeURIComponent(targetSitemap)}`;

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Length": "0",
      },
    });

    // 200 ou 204 = succès
    const ok = res.status === 200 || res.status === 204;
    return {
      property: propertyUrl,
      sitemapUrl: targetSitemap,
      ok,
      status: res.status,
      ...(ok ? {} : { error: await res.text() }),
    };
  } catch (err) {
    return {
      property: propertyUrl,
      sitemapUrl: targetSitemap,
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Inspecte une URL via l'API URL Inspection de Google Search Console.
 */
export async function inspectUrlGSC(
  urlToInspect: string,
  propertyUrl: string = GSC_DEFAULT_PROPERTY
): Promise<GscInspectionResponse> {
  const token = await getGscAccessToken();
  if (!token) {
    return {
      ok: false,
      url: urlToInspect,
      error: "Authentification GSC non disponible",
      status: 401,
    };
  }

  try {
    const endpoint = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: urlToInspect,
        siteUrl: propertyUrl,
        languageCode: "fr-FR",
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return {
        ok: false,
        url: urlToInspect,
        status: res.status,
        error: errTxt,
      };
    }

    const data = (await res.json()) as any;
    const inspectResult = data?.inspectionResult || {};
    const statusResult = inspectResult?.indexStatusResult || {};

    const details: GscInspectionDetails = {
      verdict: statusResult.verdict || "VERDICT_UNSPECIFIED",
      coverageState: statusResult.coverageState || "Non renseigné",
      robotsTxtState: statusResult.robotsTxtState || "ALLOWED",
      indexingState: statusResult.indexingState || "INDEXING_ALLOWED",
      lastCrawlTime: statusResult.lastCrawlTime,
      pageFetchState: statusResult.pageFetchState,
      googleCanonical: statusResult.googleCanonical,
      inspectionResultLink: inspectResult.inspectionResultLink,
    };

    return {
      ok: true,
      url: urlToInspect,
      verdict: details.verdict,
      details,
      status: 200,
    };
  } catch (err) {
    return {
      ok: false,
      url: urlToInspect,
      error: err instanceof Error ? err.message : String(err),
      status: 0,
    };
  }
}

/**
 * Soumet une ou plusieurs URLs au protocole universel IndexNow (Bing, Yahoo, Yandex, etc.).
 */
export async function submitIndexNow(urls: string | string[]): Promise<IndexNowResponse> {
  const urlList = Array.isArray(urls) ? urls : [urls];
  if (urlList.length === 0) {
    return { ok: true, endpoints: [] };
  }

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };

  const results: Array<{ endpoint: string; status?: number; error?: string }> = [];
  let overallSuccess = true;

  for (const ep of INDEXNOW_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      // 200 ou 202 = succès IndexNow
      if (res.status === 200 || res.status === 202) {
        results.push({ endpoint: ep, status: res.status });
      } else {
        results.push({ endpoint: ep, status: res.status, error: await res.text() });
        overallSuccess = false;
      }
    } catch (err) {
      results.push({
        endpoint: ep,
        error: err instanceof Error ? err.message : String(err),
      });
      overallSuccess = false;
    }
  }

  return { ok: overallSuccess, endpoints: results };
}

/**
 * Action complète d'indexation pour un contenu nouveau ou modifié :
 * 1. Déduit l'URL canonique (blog ou service ou générale)
 * 2. Re-soumet le sitemap à Google Search Console
 * 3. Inspecte l'URL spécifique via l'API GSC
 * 4. Pousse vers IndexNow (Bing, Yahoo, Yandex)
 * 5. Consigne dans les logs d'audit et la file quotidienne
 */
export async function submitNewOrUpdatedContent(
  options: ContentSubmissionOptions
): Promise<ContentSubmissionResult> {
  const siteUrl = getSiteUrl();
  let fullUrl = options.url;

  if (!fullUrl) {
    if (options.type === "blog" && options.slug) {
      fullUrl = `${siteUrl}/blog/${options.slug}`;
    } else if (options.type === "service" && options.slug) {
      fullUrl = `${siteUrl}/services/${options.slug}`;
    } else {
      fullUrl = siteUrl;
    }
  }

  const timestamp = new Date().toISOString();
  if (!options.silent) {
    console.log(`\n📡 [GSC & INDEXATION] Déclenchement automatique pour : ${fullUrl}`);
    if (options.title) console.log(`   Titre : « ${options.title} »`);
  }

  // 1. Re-soumission des Sitemaps sur les propriétés b2bpro.store et www
  const sitemapResults: GscSitemapSubmissionResponse[] = [];
  for (const prop of GSC_ALL_PROPERTIES) {
    const smRes = await submitSitemapToGSC(prop);
    sitemapResults.push(smRes);
    if (!options.silent) {
      if (smRes.ok) {
        console.log(`   ✓ Sitemap re-soumis à GSC [${prop}] (HTTP ${smRes.status})`);
      } else {
        console.log(`   ℹ️ Sitemap GSC [${prop}] : ${smRes.error || "Statut " + smRes.status}`);
      }
    }
  }

  // 2. Inspection d'URL GSC
  let inspectionRes: GscInspectionResponse | undefined;
  try {
    inspectionRes = await inspectUrlGSC(fullUrl);
    if (!options.silent) {
      if (inspectionRes.ok) {
        console.log(`   ✓ Inspection GSC réussie : ${inspectionRes.verdict} (${inspectionRes.details?.coverageState})`);
      } else {
        console.log(`   ℹ️ Inspection GSC : ${inspectionRes.error || "Non disponible"}`);
      }
    }
  } catch (e) {
    // Inspection tolérante
  }

  // 3. Notification IndexNow
  const indexNowRes = await submitIndexNow(fullUrl);
  if (!options.silent) {
    if (indexNowRes.ok) {
      console.log(`   ✓ IndexNow notifié avec succès (Bing, Yahoo, Yandex)`);
    } else {
      console.log(`   ℹ️ IndexNow : avertissement sur un ou plusieurs endpoints`);
    }
  }

  // 4. Inscription dans la file quotidienne docs/GSC-SOUMISSION-QUOTIDIENNE.txt
  try {
    const gscFile = path.join(process.cwd(), "docs", "GSC-SOUMISSION-QUOTIDIENNE.txt");
    const entry = `\n${fullUrl} # [AUTO-SUBMIT ${options.type.toUpperCase()}] ${timestamp}\n`;
    appendFileSync(gscFile, entry, "utf8");
  } catch {
    // Best-effort
  }

  // 5. Journalisation structurée dans docs/logs/gsc-submissions.jsonl
  const result: ContentSubmissionResult = {
    ok: sitemapResults.some((s) => s.ok) || indexNowRes.ok,
    url: fullUrl,
    title: options.title,
    type: options.type,
    timestamp,
    sitemaps: sitemapResults,
    inspection: inspectionRes,
    indexnow: indexNowRes,
  };

  try {
    const logsDir = path.join(process.cwd(), "docs", "logs");
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    const logFile = path.join(logsDir, "gsc-submissions.jsonl");
    appendFileSync(logFile, JSON.stringify(result) + "\n", "utf8");
  } catch {
    // Best-effort
  }

  if (!options.silent) {
    console.log(`   ✅ Soumission automatique terminée pour ${fullUrl}\n`);
  }

  return result;
}
