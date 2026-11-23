import { describe, expect, it } from "bun:test";
import {
  loadGscCredentials,
  getGscAccessToken,
  submitSitemapToGSC,
  inspectUrlGSC,
  submitIndexNow,
  submitNewOrUpdatedContent,
  INDEXNOW_KEY,
  INDEXNOW_HOST,
  GSC_DEFAULT_PROPERTY,
  GSC_WWW_PROPERTY,
} from "../src/lib/gsc";

describe("Google Search Console & Indexation Engine", () => {
  it("charge les identifiants OAuth2 GSC avec succès", () => {
    const creds = loadGscCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.client_id).toBeDefined();
    expect(creds?.client_secret).toBeDefined();
    expect(creds?.refresh_token).toBeDefined();
  });

  it("obtient un jeton d'accès OAuth2 valide auprès de Google", async () => {
    const token = await getGscAccessToken();
    expect(token).not.toBeNull();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(20);
  }, 30000);

  it("vérifie les constantes du protocole IndexNow", () => {
    expect(INDEXNOW_KEY).toBe("c76eea801c4640ccb314bd5c0d48767b");
    expect(INDEXNOW_HOST).toBe("b2bpro.store");
  });

  it("soumet le sitemap à la propriété principale GSC", async () => {
    const res = await submitSitemapToGSC(GSC_DEFAULT_PROPERTY);
    expect(res.property).toBe(GSC_DEFAULT_PROPERTY);
    expect(res.sitemapUrl).toBe("https://b2bpro.store/sitemap.xml");
    // 200 ou 204 attendu de Google
    expect([200, 204]).toContain(res.status);
    expect(res.ok).toBe(true);
  }, 30000);

  it("soumet le sitemap à la propriété www GSC", async () => {
    const res = await submitSitemapToGSC(GSC_WWW_PROPERTY);
    expect(res.property).toBe(GSC_WWW_PROPERTY);
    expect(res.sitemapUrl).toBe("https://www.b2bpro.store/sitemap.xml");
    expect([200, 204]).toContain(res.status);
    expect(res.ok).toBe(true);
  }, 30000);

  it("inspecte une URL existante via Google URL Inspection API", async () => {
    const testUrl = "https://b2bpro.store/blog/avis-negatifs-concurrents-marketing";
    const res = await inspectUrlGSC(testUrl);
    expect(res.ok).toBe(true);
    expect(res.url).toBe(testUrl);
    expect(res.details).toBeDefined();
    expect(res.details?.verdict).toBeDefined();
  }, 30000);

  it("exécute une soumission complète pour un article de blog", async () => {
    const res = await submitNewOrUpdatedContent({
      type: "blog",
      slug: "avis-negatifs-concurrents-marketing",
      title: "Test de soumission automatique GSC",
      silent: true,
    });
    expect(res.ok).toBe(true);
    expect(res.url).toBe("https://b2bpro.store/blog/avis-negatifs-concurrents-marketing");
    expect(res.type).toBe("blog");
    expect(res.sitemaps.length).toBe(2);
    expect(res.sitemaps.some((s) => s.ok)).toBe(true);
  }, 30000);

  it("exécute une soumission complète pour un service", async () => {
    const res = await submitNewOrUpdatedContent({
      type: "service",
      slug: "qualification-leads-b2b",
      title: "Qualification de leads B2B",
      silent: true,
    });
    expect(res.ok).toBe(true);
    expect(res.url).toBe("https://b2bpro.store/services/qualification-leads-b2b");
    expect(res.type).toBe("service");
    expect(res.sitemaps.length).toBe(2);
    expect(res.sitemaps.some((s) => s.ok)).toBe(true);
  }, 30000);
});
