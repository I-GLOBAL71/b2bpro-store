import type { Metadata } from "next";

export const SITE = {
  name: "b2bpro.store",
  fullName: "b2bpro.store — La place de marché des services digitaux B2B francophones",
  url: "https://b2bpro.store",
  description:
    "112 services digitaux B2B livrés par des experts vérifiés : veille concurrentielle, génération de leads, IA & données, SEO local. Dès 25 €, livraison 2-3 jours, avis 4,2-5,0 ★. Plateforme taillée pour tous les pays francophones.",
  tagline: "Les services digitaux B2B qui font croître votre business",
};

export const COUNTRIES = [
  "France",
  "Belgique",
  "Suisse",
  "Canada (Québec)",
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Maroc",
  "Tunisie",
  "RD Congo",
  "Bénin",
  "Togo",
  "Gabon",
  "Burkina Faso",
  "Mali",
  "Guinée",
];

export function formatPrice(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

export function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")} k`;
  return n.toLocaleString("fr-FR");
}

export const POLE_ACCENTS: Record<string, { hue: [string, string]; accent: string }> = {
  "b2b-sales-intelligence": { hue: ["#059669", "#10b981"], accent: "#059669" },
  "ecommerce-pricing": { hue: ["#d97706", "#f59e0b"], accent: "#d97706" },
  "ia-rag-data": { hue: ["#7c3aed", "#a78bfa"], accent: "#7c3aed" },
  "immobilier-local": { hue: ["#0d9488", "#14b8a6"], accent: "#0d9488" },
  "social-media-influence": { hue: ["#db2777", "#f472b6"], accent: "#db2777" },
  "rh-recrutement": { hue: ["#0891b2", "#22d3ee"], accent: "#0891b2" },
  "evenementiel-marches-publics": { hue: ["#4f46e5", "#818cf8"], accent: "#4f46e5" },
  "grand-public": { hue: ["#ea580c", "#fb923c"], accent: "#ea580c" },
  "hotellerie-tourisme": { hue: ["#be123c", "#fb7185"], accent: "#be123c" },
  "grandes-entreprises": { hue: ["#334155", "#64748b"], accent: "#334155" },
  "saas-tech": { hue: ["#2563eb", "#60a5fa"], accent: "#2563eb" },
  "seo-geo-medias": { hue: ["#16a34a", "#4ade80"], accent: "#16a34a" },
  "formation-sante": { hue: ["#9333ea", "#c084fc"], accent: "#9333ea" },
  "logistique-franchises": { hue: ["#78716c", "#a8a29e"], accent: "#78716c" },
};

export const POLE_LABELS: Record<string, string> = {
  "b2b-sales-intelligence": "B2B Sales Intelligence",
  "ecommerce-pricing": "E-commerce & Pricing",
  "ia-rag-data": "IA, RAG & Data",
  "immobilier-local": "Immobilier & Local",
  "social-media-influence": "Social Media & Influence",
  "rh-recrutement": "RH & Recrutement",
  "evenementiel-marches-publics": "Événementiel & Marchés Publics",
  "grand-public": "Grand Public & Quotidien",
  "hotellerie-tourisme": "Hôtellerie & Tourisme",
  "grandes-entreprises": "Grandes Entreprises & Finance",
  "saas-tech": "SaaS & Tech",
  "seo-geo-medias": "SEO, GEO & Médias",
  "formation-sante": "Formation & Santé",
  "logistique-franchises": "Logistique & Franchises",
};

export const POLE_DESCRIPTIONS: Record<string, string> = {
  "b2b-sales-intelligence":
    "Détection des entreprises qui recrutent, lèvent des fonds ou viennent d'être créées : captez les signaux d'intention B2B les plus chauds du marché.",
  "ecommerce-pricing":
    "Surveillance des prix, stocks, Buy Box Amazon et promotions concurrentes : prenez les bonnes décisions marchandes au bon moment.",
  "ia-rag-data":
    "Bases de connaissances propres pour Custom GPT et chatbots, datasets FAQ, glossaires métier : donnez à vos IA des données exploitables.",
  "immobilier-local":
    "Détection des annonces décotées, rentabilité locative, artisans RGE, permis de construire : l'intelligence data appliquée au local.",
  "social-media-influence":
    "Micro-influenceurs à vrai taux d'engagement, formats viraux, publicités concurrentes décryptées : construisez des campagnes qui convertissent.",
  "rh-recrutement":
    "Offres non pourvues, grilles salariales, benchmarks avantages employeurs : les données RH qui font gagner du temps aux recruteurs.",
  "evenementiel-marches-publics":
    "Veille BOAMP, annuaires d'exposants de salons pro, décisions d'attribution : ne ratez plus aucun contrat ni opportunité B2B.",
  "grand-public":
    "Voitures sous la cote, appartements entre particuliers, comparateurs travaux et EHPAD : les meilleures données pour vos décisions de vie.",
  "hotellerie-tourisme":
    "Veille tarifaire Airbnb, benchmark menus Uber Eats, avis touristiques multilingues : pilotez votre établissement avec des données fraîches.",
  "grandes-entreprises":
    "Santé financière fournisseurs, sourcing fabricants européens, conformité RGPD, RSE : l'intelligence décisionnelle des grands comptes.",
  "saas-tech":
    "Avis G2 et Capterra décryptés, grilles tarifaires concurrentes, veille Product Hunt et changelogs : gagnez la bataille produit.",
  "seo-geo-medias":
    "Audit de visibilité dans les IA, sitemaps concurrents, People Also Ask, podcasts et fichiers presse : soyez cité là où ça compte.",
  "formation-sante":
    "Aides publiques, organismes Qualiopi, formations CPF, recherches PubMed : captez les opportunités des secteurs formation et santé.",
  "logistique-franchises":
    "Réseaux de franchises, bornes IRVE, rappels produits, marques étrangères non distribuées : dénichez les opportunités invisibles.",
};

export const POLE_ICONS: Record<string, string> = {
  "b2b-sales-intelligence": "target",
  "ecommerce-pricing": "shopping-cart",
  "ia-rag-data": "bot",
  "immobilier-local": "building-2",
  "social-media-influence": "megaphone",
  "rh-recrutement": "users",
  "evenementiel-marches-publics": "calendar-days",
  "grand-public": "heart-handshake",
  "hotellerie-tourisme": "utensils-crossed",
  "grandes-entreprises": "briefcase",
  "saas-tech": "cpu",
  "seo-geo-medias": "trending-up",
  "formation-sante": "graduation-cap",
  "logistique-franchises": "truck",
};

export function defaultMetadata(): Metadata {
  return {
    title: {
      default: "b2bpro.store — Services digitaux B2B francophones dès 25 €",
      template: "%s | b2bpro.store",
    },
    description: SITE.description,
    metadataBase: new URL(SITE.url),
    openGraph: {
      type: "website",
      siteName: "b2bpro.store",
      locale: "fr_FR",
      title: "b2bpro.store — Services digitaux B2B francophones",
      description: SITE.description,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}
