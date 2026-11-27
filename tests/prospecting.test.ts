import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UnsubscribeBox } from "../src/components/site/unsubscribe-box";
import { buildDeterministicProspectCopy } from "../src/lib/prospecting/copywriter";
import {
  buildRssXml,
  generatePinterestRssXml,
  generateSyndicationRssXml,
} from "../src/lib/prospecting/rss";
import {
  auditWebsiteHtml,
  buildDomainCandidates,
  extractPublicB2bEmails,
} from "../src/lib/prospecting/sourcer";
import {
  buildUnsubscribeUrl,
  defaultProspectingConfig,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../src/lib/prospecting/types";

describe("Moteur de Prospection B2B Autonome", () => {
  it("signe et vérifie les jetons RGPD de désinscription en 1 clic", () => {
    const email = "Contact@Agence-Lyon.fr ";
    const token = signUnsubscribeToken(email);

    expect(token).toMatch(/^[a-f0-9]{32}$/);
    expect(verifyUnsubscribeToken("contact@agence-lyon.fr", token)).toBe(true);
    expect(verifyUnsubscribeToken("autre@agence-lyon.fr", token)).toBe(false);
    expect(verifyUnsubscribeToken("contact@agence-lyon.fr", "0".repeat(32))).toBe(false);

    const url = buildUnsubscribeUrl("contact@agence-lyon.fr", "https://b2bpro.store");
    expect(url).toStartWith("https://b2bpro.store/desinscription?e=contact%40agence-lyon.fr&t=");
  });

  it("extrait uniquement les emails B2B publics du domaine cible et rejette les adresses à risque", () => {
    const html = `
      <div>
        <a href="mailto:noreply@exemple-b2b.fr">noreply</a>
        <a href="mailto:dpo@exemple-b2b.fr">dpo</a>
        <a href="mailto:recrutement@exemple-b2b.fr">jobs</a>
        <a href="mailto:contact@autre-domaine.fr">tiers</a>
        <a href="mailto:perso@gmail.com">gmail</a>
        <a href="mailto:Bonjour@exemple-b2b.fr">bonjour</a>
        <p>Ecrivez-nous a contact&#64;exemple-b2b&#46;fr ou info@www.exemple-b2b.fr</p>
        <span data-cfemail="7a121f1616153a1f021f170a161f57184818541c08">protected</span>
      </div>
    `;
    const found = extractPublicB2bEmails(html, "exemple-b2b.fr");
    expect(found).toEqual([
      "contact@exemple-b2b.fr",
      "bonjour@exemple-b2b.fr",
      "hello@exemple-b2b.fr",
      "info@www.exemple-b2b.fr",
    ]);
  });

  it("génère des candidats de domaine propres sans formes juridiques ni noms patronymiques", () => {
    expect(buildDomainCandidates("MONSIEUR JEAN DUPONT")).toEqual([]);
    const candidates = buildDomainCandidates("SAS CODE ROUGE AGENCE DE COMMUNICATION");
    expect(candidates.some((d) => d.startsWith("coderouge."))).toBe(true);
  });

  it("audite le HTML d'un site prospect sans aucun tiret cadratin", () => {
    const findings = auditWebsiteHtml({
      url: "https://exemple-b2b.fr/",
      domain: "exemple-b2b.fr",
      statusCode: 200,
      ttfbMs: 1450,
      html: "<html><head><title>Agence Exemple</title><meta name='description' content='Court'></head><body><div>Bienvenue</div></body></html>",
      hasLlmsTxt: false,
    });

    expect(findings.hasLlmsTxt).toBe(false);
    expect(findings.hasJsonLd).toBe(false);
    expect(findings.hasOpenGraph).toBe(false);
    expect(findings.hasH1).toBe(false);
    expect(findings.issues.length).toBeGreaterThanOrEqual(3);
    expect(findings.issues.join(" ")).not.toContain("—");
  });

  it("génère des emails initiaux et J+3 conformes avec CTA service, support et désinscription", () => {
    const config = defaultProspectingConfig();
    const findings = auditWebsiteHtml({
      url: "https://exemple-lyon.fr/",
      domain: "exemple-lyon.fr",
      statusCode: 200,
      ttfbMs: 400,
      html: "<html><head><title>Exemple Lyon</title></head><body><h1>Bonjour</h1></body></html>",
      hasLlmsTxt: false,
    });

    const initial = buildDeterministicProspectCopy({
      companyName: "Exemple Lyon",
      city: "Lyon",
      domain: "exemple-lyon.fr",
      email: "contact@exemple-lyon.fr",
      poleSlug: "seo-geo-medias",
      serviceSlug: "je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia",
      serviceTitle: "Je vais auditer si votre marque est recommandee par les moteurs IA",
      servicePrice: 45,
      deliveryDays: 2,
      findings,
      config,
      isFollowup: false,
      siteUrl: "https://b2bpro.store",
    });

    expect(initial.subject).not.toContain("—");
    expect(initial.textBody).not.toContain("—");
    expect(initial.htmlBody).not.toContain("—");
    expect(initial.textBody).toContain("Thomas Laurent");
    expect(initial.textBody).toContain("Lyon, France");
    expect(initial.textBody).toContain("https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia");
    expect(initial.textBody).toContain("https://b2bpro.store/support");
    expect(initial.textBody).toContain("https://b2bpro.store/desinscription");

    const followup = buildDeterministicProspectCopy({
      companyName: "Exemple Lyon",
      city: "Lyon",
      domain: "exemple-lyon.fr",
      email: "contact@exemple-lyon.fr",
      poleSlug: "seo-geo-medias",
      serviceSlug: "je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia",
      serviceTitle: "Je vais auditer si votre marque est recommandee par les moteurs IA",
      servicePrice: 45,
      deliveryDays: 2,
      findings,
      config,
      isFollowup: true,
      siteUrl: "https://b2bpro.store",
    });

    expect(followup.subject).toContain("Suite");
    expect(followup.htmlBody).toContain("Poser une question au support b2bpro.store");
  });

  it("génère des flux RSS 2.0 valides et échappés pour Pinterest et la syndication", async () => {
    const simpleXml = buildRssXml({
      title: "Test & B2B <Pro>",
      description: "Flux B2B",
      feedUrl: "https://b2bpro.store/pinterest-rss.xml",
      siteUrl: "https://b2bpro.store",
      items: [
        {
          title: "Offre <Test> & Co",
          link: "https://b2bpro.store/services/demo?a=1&b=2",
          guid: "https://b2bpro.store/services/demo",
          description: "Description claire",
          pubDate: new Date("2026-11-25T10:00:00Z"),
          imageUrl: "https://b2bpro.store/og-default.png",
        },
      ],
    });
    expect(simpleXml).toContain("Test &amp; B2B &lt;Pro&gt;");
    expect(simpleXml).toContain("<enclosure url=\"https://b2bpro.store/og-default.png\"");

    const [pinXml, synXml] = await Promise.all([
      generatePinterestRssXml(),
      generateSyndicationRssXml(),
    ]);
    expect(pinXml).toContain("<rss version=\"2.0\"");
    expect(pinXml).toContain("utm_source=pinterest");
    expect(synXml).toContain("xmlns:content=\"http://purl.org/rss/1.0/modules/content/\"");
    expect(synXml).toContain("/support?utm_source=rss");
  });

  it("rend la page de désinscription responsive et accessible sans jargon", () => {
    const htmlPending = renderToStaticMarkup(
      React.createElement(UnsubscribeBox, { initialDone: false, initialEmail: "" }),
    );
    expect(htmlPending).toContain("min-h-[60px]");
    expect(htmlPending).toContain("Me désinscrire maintenant");
    expect(htmlPending).toContain("w-full min-w-0");

    const htmlDone = renderToStaticMarkup(
      React.createElement(UnsubscribeBox, {
        initialDone: true,
        initialEmail: "contact@exemple.fr",
      }),
    );
    expect(htmlDone).toContain("désinscrit");
    expect(htmlDone).toContain("contact@exemple.fr");
  });
});
