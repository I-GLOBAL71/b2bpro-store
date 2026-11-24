/**
 * GENERATE 8 UNIQUE FLOW PINS (ANTI-DUPLICATE ENGINE)
 * b2bpro.store - 2026
 * 
 * Génère 8 visuels 100% uniques, originaux et percutants pour les 8 services
 * rejetés par Pinterest pour duplicate image.
 * 
 * Résout définitivement l'erreur "Duplicate Pin image" en produisant des images
 * au hash perceptuel totalement neuf avec une direction artistique 3D futuriste.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

const OUTPUT_DIR = path.join(process.cwd(), "public", "pinterest", "pins-flow");
const CSV_8_ROOT = path.join(process.cwd(), "pinterest-bulk-upload-8-missing-flow.csv");
const CSV_8_DOWNLOADS = "C:/Users/Administrateur/Downloads/pinterest-bulk-upload-8-missing-flow.csv";
const CSV_100_ROOT = path.join(process.cwd(), "pinterest-bulk-upload-100-flow.csv");
const CSV_100_PUBLIC = path.join(process.cwd(), "public", "pinterest", "pinterest-bulk-upload-100-flow.csv");
const CSV_100_DOWNLOADS = "C:/Users/Administrateur/Downloads/pinterest-bulk-upload-100-flow.csv";
const GALLERY_PUBLIC = path.join(process.cwd(), "public", "pinterest", "preview-gallery-flow.html");
const GALLERY_DOWNLOADS = "C:/Users/Administrateur/Downloads/preview-gallery-flow.html";

const BASE_URL = "https://b2bpro.store";
const GITHUB_RAW = "https://raw.githubusercontent.com/I-GLOBAL71/b2bpro-store/main/public/pinterest/pins-flow";

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

interface MissingPinDef {
  num: string;
  slug: string;
  filename: string;
  shortTitle: string;
  fullTitle: string;
  price: number;
  board: string;
  theme: {
    bg1: string;
    bg2: string;
    neon1: string;
    neon2: string;
    accent: string;
    badgeBg: string;
  };
  benefits: [string, string, string];
  illustrationType: string;
  keywords: string;
  description: string;
}

const MISSING_8_PINS: MissingPinDef[] = [
  {
    num: "093",
    slug: "je-vais-reperer-les-entreprises-qui-ouvrent-une-agence-dans-votre-vill",
    filename: "pin-flow-093-je-vais-reperer-les-entreprises-qui-ouvrent-une-agence-dans-votre-vill.webp",
    shortTitle: "NOUVELLES AGENCES LOCALES",
    fullTitle: "Repérer les entreprises qui ouvrent une agence dans votre ville",
    price: 35,
    board: "B2B Growth & Prospection Commerciale",
    theme: {
      bg1: "#02120b",
      bg2: "#042416",
      neon1: "#10e891",
      neon2: "#00f5ff",
      accent: "#ffb703",
      badgeBg: "rgba(16, 232, 145, 0.15)"
    },
    benefits: [
      "Fichier SIRET & adresses vérifiées",
      "Nom du dirigeant & contact direct",
      "Date exacte d'immatriculation"
    ],
    illustrationType: "city_radar",
    keywords: "prospection b2b locale, nouvelles entreprises ville, ouverture agence, fichier siret qualifie, b2bpro",
    description: "🚀 Automatisez et boostez votre prospection locale : Repérer les entreprises qui ouvrent une agence dans votre ville. Livrable clé en main dès 35 € garanti : 1) Fichier SIRET & adresses vérifiées 2) Nom du dirigeant & contact direct 3) Date exacte d'immatriculation. Vendeur d'élite noté 4.9/5 (182+ commandes). Paiement 100% sécurisé et séquestré. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #prospectionb2b #entreprisepro #fichierprospect #growthmarketing #b2bpro"
  },
  {
    num: "094",
    slug: "je-vais-compiler-des-profils-instagram-avec-email-pro-public-en-bio",
    filename: "pin-flow-094-je-vais-compiler-des-profils-instagram-avec-email-pro-public-en-bio.webp",
    shortTitle: "PROSPECTION INSTAGRAM B2B",
    fullTitle: "Compiler des profils Instagram avec email pro public en bio",
    price: 30,
    board: "B2B Growth & Prospection Commerciale",
    theme: {
      bg1: "#13051e",
      bg2: "#27083b",
      neon1: "#ec4899",
      neon2: "#a855f7",
      accent: "#00f5ff",
      badgeBg: "rgba(236, 72, 153, 0.15)"
    },
    benefits: [
      "Emails pros vérifiés (0 rebond garanti)",
      "Taux d'engagement & niche ciblée",
      "Fichier Excel / CSV prêt pour vos emails"
    ],
    illustrationType: "insta_lens",
    keywords: "emails instagram prospection, influenceurs b2b, extraction bio instagram, scrapping email pro, growth",
    description: "🚀 Obtenez des leads chauds qualifiés : Compiler des profils Instagram avec email pro public en bio. Livrable clé en main dès 30 € garanti : 1) Emails pros vérifiés (0 rebond garanti) 2) Taux d'engagement & niche ciblée 3) Fichier Excel / CSV prêt pour vos emails. Vendeur d'élite noté 4.8/5 (210+ commandes). 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #instagrampro #prospectionia #leadgeneration #growthhacking #b2bpro"
  },
  {
    num: "095",
    slug: "je-vais-controler-les-prix-pratiques-par-les-revendeurs-de-votre-marqu",
    filename: "pin-flow-095-je-vais-controler-les-prix-pratiques-par-les-revendeurs-de-votre-marqu.webp",
    shortTitle: "VEILLE PRIX REVENDEURS",
    fullTitle: "Contrôler les prix pratiqués par les revendeurs de votre marque",
    price: 40,
    board: "E-commerce, Amazon & Veille Prix",
    theme: {
      bg1: "#0b1022",
      bg2: "#081d45",
      neon1: "#38bdf8",
      neon2: "#2563eb",
      accent: "#f59e0b",
      badgeBg: "rgba(56, 189, 248, 0.15)"
    },
    benefits: [
      "Tableau comparatif des 20+ revendeurs",
      "Détection des prix cassés sous le PVC",
      "Captures d'écran horodatées & preuves"
    ],
    illustrationType: "price_shield",
    keywords: "controle prix revendeurs, veille tarifaire marque, pvr respect distributeurs, surveillance ecommerce, b2bpro",
    description: "🚀 Protégez l'image et la rentabilité de votre marque : Contrôler les prix pratiqués par les revendeurs de votre marque. Livrable clé en main dès 40 € garanti : 1) Tableau comparatif des 20+ revendeurs 2) Détection des prix cassés sous le PVC 3) Captures d'écran horodatées & preuves. Vendeur d'élite noté 4.9/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #ecommercepro #veilleprix #distributionpro #pricingstrategy #b2bpro"
  },
  {
    num: "096",
    slug: "je-vais-analyser-les-avis-1-etoile-des-applications-mobiles-rivales",
    filename: "pin-flow-096-je-vais-analyser-les-avis-1-etoile-des-applications-mobiles-rivales.webp",
    shortTitle: "AUDIT FAIBLESSES CONCURRENTES",
    fullTitle: "Analyser les avis 1 étoile des applications mobiles rivales",
    price: 30,
    board: "Veille Stratégique & Automatisation",
    theme: {
      bg1: "#1a0808",
      bg2: "#350d0d",
      neon1: "#f43f5e",
      neon2: "#fb7185",
      accent: "#fbbf24",
      badgeBg: "rgba(244, 63, 94, 0.15)"
    },
    benefits: [
      "Top 10 des bugs & manques signalés",
      "Synthèse des frustrations utilisateurs",
      "Opportunités clés pour votre propre app"
    ],
    illustrationType: "broken_star",
    keywords: "analyse avis negatifs rivaux, etude marche application mobile, veille concurrentielle bugs, aso benchmarking",
    description: "🚀 Exploitez les failles de vos concurrents : Analyser les avis 1 étoile des applications mobiles rivales. Livrable clé en main dès 30 € garanti : 1) Top 10 des bugs & manques signalés 2) Synthèse des frustrations utilisateurs 3) Opportunités clés pour votre propre app. Vendeur d'élite noté 4.9/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #veillestrategique #appmobile #benchmarking #produitdigital #b2bpro"
  },
  {
    num: "097",
    slug: "je-vais-extraire-tous-les-sujets-d-articles-publies-par-vos-rivaux",
    filename: "pin-flow-097-je-vais-extraire-tous-les-sujets-d-articles-publies-par-vos-rivaux.webp",
    shortTitle: "VEILLE ÉDITORIALE & SEO",
    fullTitle: "Extraire tous les sujets d'articles publiés par vos rivaux",
    price: 30,
    board: "SEO Local, Google Maps & Médias",
    theme: {
      bg1: "#06131c",
      bg2: "#0c2738",
      neon1: "#00f5ff",
      neon2: "#10e891",
      accent: "#a855f7",
      badgeBg: "rgba(0, 245, 255, 0.15)"
    },
    benefits: [
      "Liste exhaustive des articles concurrents",
      "Fréquence de publication & calendrier",
      "Angles SEO inexploités pour votre blog"
    ],
    illustrationType: "content_matrix",
    keywords: "extraction articles concurrents, plan editorial seo, veille contenu blog, content marketing pme, b2bpro",
    description: "🚀 Dominez le référencement naturel de votre niche : Extraire tous les sujets d'articles publiés par vos rivaux. Livrable clé en main dès 30 € garanti : 1) Liste exhaustive des articles concurrents 2) Fréquence de publication & calendrier 3) Angles SEO inexploités pour votre blog. Vendeur d'élite noté 4.8/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #seopro #contentmarketing #veilleeditoriale #visibilitegoogle #b2bpro"
  },
  {
    num: "098",
    slug: "je-vais-trouver-les-createurs-tiktok-emergents-dans-votre-thematique",
    filename: "pin-flow-098-je-vais-trouver-les-createurs-tiktok-emergents-dans-votre-thematique.webp",
    shortTitle: "INFLUENCE TIKTOK VIRALE",
    fullTitle: "Trouver les créateurs TikTok émergents dans votre thématique",
    price: 30,
    board: "SEO Local, Google Maps & Médias",
    theme: {
      bg1: "#050616",
      bg2: "#10092c",
      neon1: "#00f5ff",
      neon2: "#ec4899",
      accent: "#ffb703",
      badgeBg: "rgba(0, 245, 255, 0.15)"
    },
    benefits: [
      "Créateurs à fort engagement (< 100k)",
      "Coordonnées & formats de vidéos virales",
      "Tarifs indicatifs & potentiel de vente"
    ],
    illustrationType: "tiktok_prism",
    keywords: "createurs tiktok emergents, micro influenceurs tiktok, partenariat video virale, ugc tiktok marque, b2bpro",
    description: "🚀 Faites exploser vos ventes grâce à l'UGC : Trouver les créateurs TikTok émergents dans votre thématique. Livrable clé en main dès 30 € garanti : 1) Créateurs à fort engagement (< 100k) 2) Coordonnées & formats de vidéos virales 3) Tarifs indicatifs & potentiel de vente. Vendeur certifié noté 4.9/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #tiktokpro #influenceur #videovirale #growthmarketing #b2bpro"
  },
  {
    num: "099",
    slug: "je-vais-analyser-les-publicites-facebook-et-tiktok-de-vos-concurrents",
    filename: "pin-flow-099-je-vais-analyser-les-publicites-facebook-et-tiktok-de-vos-concurrents.webp",
    shortTitle: "AD SPY FACEBOOK & TIKTOK",
    fullTitle: "Analyser les publicités Facebook et TikTok de vos concurrents",
    price: 25,
    board: "Veille Stratégique & Automatisation",
    theme: {
      bg1: "#070c20",
      bg2: "#14153d",
      neon1: "#6366f1",
      neon2: "#a855f7",
      accent: "#00f5ff",
      badgeBg: "rgba(99, 102, 241, 0.15)"
    },
    benefits: [
      "Ads actives depuis +30 jours (gagnantes)",
      "Décorticage des hooks, visuels & offres",
      "Angles marketing prêts à transposer"
    ],
    illustrationType: "ad_spy",
    keywords: "ad spy facebook tiktok, analyse publicites concurrents, hooks publicitaires gagnants, media buying roas, b2bpro",
    description: "🚀 Ne dépensez plus à l'aveugle en ads : Analyser les publicités Facebook et TikTok de vos concurrents. Livrable clé en main dès 25 € garanti : 1) Ads actives depuis +30 jours (gagnantes) 2) Décorticage des hooks, visuels & offres 3) Angles marketing prêts à transposer. Vendeur d'élite noté 4.9/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #facebookads #tiktokads #mediabuying #adspy #b2bpro"
  },
  {
    num: "100",
    slug: "je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles",
    filename: "pin-flow-100-je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles.webp",
    shortTitle: "COMPARATEUR GROSSISTES B2B",
    fullTitle: "Comparer automatiquement les tarifs de vos 3 grossistes clés",
    price: 35,
    board: "E-commerce, Amazon & Veille Prix",
    theme: {
      bg1: "#03120d",
      bg2: "#072418",
      neon1: "#10e891",
      neon2: "#ffb703",
      accent: "#38bdf8",
      badgeBg: "rgba(16, 232, 145, 0.15)"
    },
    benefits: [
      "Tableau comparatif SKU par SKU",
      "Calcul automatique de la marge nette",
      "Détection des meilleures remises volume"
    ],
    illustrationType: "wholesale_scale",
    keywords: "comparateur grossistes, reduction couts d achat, calcul marge nette e commerce, optimisation approvisionnement",
    description: "🚀 Réduisez immédiatement vos coûts d'achat : Comparer automatiquement les tarifs de vos 3 grossistes clés. Livrable clé en main dès 35 € garanti : 1) Tableau comparatif SKU par SKU 2) Calcul automatique de la marge nette 3) Détection des meilleures remises volume. Vendeur d'élite noté 4.9/5. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! #grossistepro #achatsb2b #ecommercepro #margenette #b2bpro"
  }
];

function wrapTitle(title: string): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length <= 28) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function renderCentralGraphic(type: string, t: any): string {
  switch (type) {
    case "city_radar":
      return `
        <!-- 3D City Radar -->
        <circle cx="500" cy="720" r="230" fill="none" stroke="${t.neon1}" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="8 6"/>
        <circle cx="500" cy="720" r="160" fill="none" stroke="${t.neon2}" stroke-width="1.5" stroke-opacity="0.4"/>
        <circle cx="500" cy="720" r="90" fill="none" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.5"/>
        <line x1="270" y1="720" x2="730" y2="720" stroke="${t.neon1}" stroke-width="1" stroke-opacity="0.3"/>
        <line x1="500" y1="490" x2="500" y2="950" stroke="${t.neon1}" stroke-width="1" stroke-opacity="0.3"/>
        <!-- 3D City Buildings -->
        <polygon points="430,780 470,750 510,780 470,810" fill="${t.neon1}" fill-opacity="0.2" stroke="${t.neon1}" stroke-width="2"/>
        <polygon points="470,750 470,640 510,670 510,780" fill="${t.neon2}" fill-opacity="0.3" stroke="${t.neon2}" stroke-width="2"/>
        <polygon points="430,780 430,670 470,640 470,750" fill="${t.neon1}" fill-opacity="0.5" stroke="${t.neon1}" stroke-width="2"/>
        <!-- Building 2 taller -->
        <polygon points="500,750 540,720 580,750 540,780" fill="${t.neon2}" fill-opacity="0.2" stroke="${t.neon2}" stroke-width="2"/>
        <polygon points="540,720 540,580 580,610 580,750" fill="${t.neon1}" fill-opacity="0.35" stroke="${t.neon1}" stroke-width="2"/>
        <polygon points="500,750 500,610 540,580 540,720" fill="${t.neon2}" fill-opacity="0.55" stroke="${t.neon2}" stroke-width="2"/>
        <!-- Pulsing Agency Beacons -->
        <g transform="translate(540, 560)">
          <circle cx="0" cy="0" r="24" fill="${t.accent}" fill-opacity="0.3"/>
          <circle cx="0" cy="0" r="12" fill="${t.accent}"/>
          <text x="0" y="5" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="900" fill="#02120b" text-anchor="middle">★</text>
        </g>
        <rect x="340" y="850" width="320" height="50" rx="10" fill="#081e14" stroke="${t.neon1}" stroke-width="1.5"/>
        <text x="500" y="882" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="${t.neon1}" text-anchor="middle">📍 DÉTECTION : NOUVELLE AGENCE LOCALE</text>
      `;

    case "insta_lens":
      return `
        <!-- 3D Holographic Instagram Camera & Email Lens -->
        <rect x="360" y="580" width="280" height="280" rx="60" fill="url(#igGrad)" stroke="${t.neon1}" stroke-width="3" filter="url(#glow)"/>
        <circle cx="500" cy="720" r="85" fill="#0b0416" stroke="#ffffff" stroke-width="8"/>
        <circle cx="500" cy="720" r="55" fill="${t.neon2}" fill-opacity="0.4" stroke="${t.accent}" stroke-width="3"/>
        <circle cx="580" cy="640" r="16" fill="#ffffff"/>
        <!-- Floating Email Hologram Card -->
        <g transform="translate(330, 810)">
          <rect width="340" height="70" rx="14" fill="#1b082d" stroke="${t.neon2}" stroke-width="2"/>
          <circle cx="45" cy="35" r="22" fill="${t.neon1}" fill-opacity="0.3"/>
          <text x="45" y="42" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">@</text>
          <text x="85" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#ffffff">contact.pro@societe.fr</text>
          <text x="85" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="${t.accent}">✓ Email Vérifié en Bio • 100% Frais</text>
        </g>
      `;

    case "price_shield":
      return `
        <!-- 3D Holographic Price Radar Shield -->
        <polygon points="500,530 650,580 650,750 500,890 350,750 350,580" fill="#061633" stroke="${t.neon1}" stroke-width="3" filter="url(#glow)"/>
        <polygon points="500,560 620,600 620,730 500,845 380,730 380,600" fill="#0b2452" fill-opacity="0.6" stroke="${t.accent}" stroke-width="1.5"/>
        <!-- Crosshair Scanner Laser -->
        <line x1="320" y1="710" x2="680" y2="710" stroke="${t.accent}" stroke-width="3" stroke-dasharray="10 5"/>
        <!-- Price Comparison Tags -->
        <rect x="390" y="630" width="220" height="42" rx="8" fill="#1e293b" stroke="#ffffff" stroke-width="1"/>
        <text x="500" y="657" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle">PVC Recommandé : 89,90€</text>
        <rect x="390" y="740" width="220" height="48" rx="8" fill="#450a0a" stroke="#ef4444" stroke-width="2"/>
        <text x="500" y="770" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="900" fill="#fca5a5" text-anchor="middle">⚠️ Revendeur X : 64,00€ (-28%)</text>
      `;

    case "broken_star":
      return `
        <!-- 3D Smartphone with 1-Star Review Flaw Detection -->
        <rect x="370" y="550" width="260" height="380" rx="36" fill="#1c0707" stroke="${t.neon1}" stroke-width="3" filter="url(#glow)"/>
        <rect x="440" y="565" width="120" height="12" rx="6" fill="#300d0d"/>
        <!-- Big Red Broken Star Badge -->
        <g transform="translate(500, 680)">
          <circle cx="0" cy="0" r="65" fill="#4c0519" stroke="${t.neon1}" stroke-width="2"/>
          <text x="0" y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="70" font-weight="900" fill="#f43f5e" text-anchor="middle">★</text>
          <text x="0" y="48" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="#fecdd3" text-anchor="middle">NOTE 1.0 / 5</text>
        </g>
        <rect x="395" y="770" width="210" height="50" rx="8" fill="#2a0808" stroke="${t.neon1}" stroke-width="1"/>
        <text x="500" y="792" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">Failles &amp; Bugs Signalés</text>
        <text x="500" y="810" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="${t.accent}" text-anchor="middle">Opportunités Produit Clés</text>
      `;

    case "content_matrix":
      return `
        <!-- Holographic Content Matrix Diagram -->
        <g transform="translate(320, 560)">
          <rect width="360" height="320" rx="20" fill="#081b29" stroke="${t.neon1}" stroke-width="2" filter="url(#glow)"/>
          <rect x="25" y="25" width="310" height="45" rx="8" fill="#112d42" stroke="${t.neon2}" stroke-width="1"/>
          <text x="45" y="53" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="800" fill="${t.neon1}">📄 Article Rival 1 : Guide SEO 2026</text>
          <rect x="25" y="85" width="310" height="45" rx="8" fill="#112d42" stroke="${t.neon2}" stroke-width="1"/>
          <text x="45" y="113" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="800" fill="${t.neon1}">📄 Article Rival 2 : Outils IA gratuits</text>
          <rect x="25" y="145" width="310" height="45" rx="8" fill="#112d42" stroke="${t.neon2}" stroke-width="1"/>
          <text x="45" y="173" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="800" fill="${t.neon1}">📄 Article Rival 3 : Stratégie B2B</text>
          <!-- Golden SEO Gap Badge -->
          <rect x="25" y="215" width="310" height="75" rx="10" fill="#042013" stroke="${t.neon2}" stroke-width="2"/>
          <text x="180" y="248" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="900" fill="#10e891" text-anchor="middle">🎯 38 ANGLES SEO INEXPLOITÉS</text>
          <text x="180" y="272" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#a7f3d0" text-anchor="middle">À cibler pour dépasser leurs positions</text>
        </g>
      `;

    case "tiktok_prism":
      return `
        <!-- 3D TikTok Viral Prism Note -->
        <g transform="translate(500, 710)" filter="url(#glow)">
          <circle cx="0" cy="0" r="160" fill="none" stroke="${t.neon1}" stroke-width="2" stroke-dasharray="12 6"/>
          <!-- TikTok Hologram Note Shape -->
          <path d="M-20,-70 L20,-70 L20,30 A45,45 0 1,1 -25,-15 L-25,-30 A30,30 0 1,0 5,15 L5,-50 L35,-50 A40,40 0 0,0 60,-20 L60,-50 A60,60 0 0,1 -20,-70 Z" fill="${t.neon1}"/>
          <path d="M-15,-65 L25,-65 L25,35 A45,45 0 1,1 -20,-10 L-20,-25 A30,30 0 1,0 10,20 L10,-45 L40,-45 A40,40 0 0,0 65,-15 L65,-45 A60,60 0 0,1 -15,-65 Z" fill="${t.neon2}" fill-opacity="0.8"/>
        </g>
        <g transform="translate(340, 840)">
          <rect width="320" height="55" rx="12" fill="#13082b" stroke="${t.neon2}" stroke-width="2"/>
          <text x="160" y="34" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">🔥 CRÉATEURS VIRAUX &lt; 100K CIBLÉS</text>
        </g>
      `;

    case "ad_spy":
      return `
        <!-- Dual Ad Spy Monitors -->
        <g transform="translate(310, 570)" filter="url(#glow)">
          <!-- Screen 1 Facebook -->
          <rect x="0" y="0" width="180" height="230" rx="14" fill="#0d1538" stroke="#3b82f6" stroke-width="2"/>
          <rect x="15" y="15" width="150" height="90" rx="8" fill="#1e293b"/>
          <text x="90" y="65" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="900" fill="#60a5fa" text-anchor="middle">FB ADS</text>
          <text x="90" y="140" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">Active 45 jours</text>
          <text x="90" y="165" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#34d399" text-anchor="middle">✓ Ad Gagnante</text>
          <!-- Screen 2 TikTok -->
          <rect x="200" y="0" width="180" height="230" rx="14" fill="#180c2f" stroke="#ec4899" stroke-width="2"/>
          <rect x="215" y="15" width="150" height="90" rx="8" fill="#1e293b"/>
          <text x="290" y="65" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="900" fill="#f472b6" text-anchor="middle">TIKTOK</text>
          <text x="290" y="140" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">Hook Vidéo #1</text>
          <text x="290" y="165" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="#fbbf24" text-anchor="middle">★ ROAS x4.2</text>
        </g>
        <rect x="340" y="830" width="320" height="50" rx="10" fill="#0b112c" stroke="${t.neon1}" stroke-width="1.5"/>
        <text x="500" y="862" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="800" fill="${t.neon1}" text-anchor="middle">🔍 DÉCORTICAGE COMPLET DES PUBLICITÉS</text>
      `;

    case "wholesale_scale":
      return `
        <!-- 3D Wholesale Multi-Balance Scales -->
        <g transform="translate(500, 700)" filter="url(#glow)">
          <rect x="-8" y="-120" width="16" height="240" fill="${t.neon1}"/>
          <polygon points="0,-140 -40,-120 40,-120" fill="${t.accent}"/>
          <line x1="-160" y1="-80" x2="160" y2="-80" stroke="${t.neon2}" stroke-width="6"/>
          <!-- Scale 1 -->
          <line x1="-150" y1="-80" x2="-180" y2="0" stroke="#94a3b8" stroke-width="2"/>
          <line x1="-150" y1="-80" x2="-120" y2="0" stroke="#94a3b8" stroke-width="2"/>
          <rect x="-195" y="0" width="90" height="40" rx="6" fill="#064e3b" stroke="${t.neon1}" stroke-width="2"/>
          <text x="-150" y="25" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">Grossiste A</text>
          <!-- Scale 2 -->
          <line x1="150" y1="-80" x2="120" y2="20" stroke="#94a3b8" stroke-width="2"/>
          <line x1="150" y1="-80" x2="180" y2="20" stroke="#94a3b8" stroke-width="2"/>
          <rect x="105" y="20" width="90" height="40" rx="6" fill="#78350f" stroke="${t.accent}" stroke-width="2"/>
          <text x="150" y="45" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">Grossiste B</text>
        </g>
        <g transform="translate(340, 840)">
          <rect width="320" height="55" rx="12" fill="#042014" stroke="${t.neon1}" stroke-width="2"/>
          <text x="160" y="34" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="900" fill="#10e891" text-anchor="middle">💰 ÉCONOMIE MOYENNE : -22% SUR VOS ACHATS</text>
        </g>
      `;

    default:
      return "";
  }
}

function generateSvg(pin: MissingPinDef): string {
  const t = pin.theme;
  const titleLines = wrapTitle(pin.fullTitle);

  return `
  <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${t.bg1}"/>
        <stop offset="50%" stop-color="#030712"/>
        <stop offset="100%" stop-color="${t.bg2}"/>
      </linearGradient>

      <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="50%" stop-color="#ec4899"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>

      <radialGradient id="topGlow" cx="50%" cy="15%" r="60%">
        <stop offset="0%" stop-color="${t.neon1}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${t.neon1}" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="bottomGlow" cx="50%" cy="85%" r="50%">
        <stop offset="0%" stop-color="${t.neon2}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${t.neon2}" stop-opacity="0"/>
      </radialGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Fond Sombre Cyber & Lueur Atmosphérique -->
    <rect width="1000" height="1500" fill="url(#bgGrad)"/>
    <rect width="1000" height="1500" fill="url(#topGlow)"/>
    <rect width="1000" height="1500" fill="url(#bottomGlow)"/>

    <!-- Grille Cybernétique Subtile -->
    <g opacity="0.08" stroke="#ffffff" stroke-width="1">
      <line x1="100" y1="0" x2="100" y2="1500"/>
      <line x1="300" y1="0" x2="300" y2="1500"/>
      <line x1="500" y1="0" x2="500" y2="1500"/>
      <line x1="700" y1="0" x2="700" y2="1500"/>
      <line x1="900" y1="0" x2="900" y2="1500"/>
      <line x1="0" y1="300" x2="1000" y2="300"/>
      <line x1="0" y1="600" x2="1000" y2="600"/>
      <line x1="0" y1="900" x2="1000" y2="900"/>
      <line x1="0" y1="1200" x2="1000" y2="1200"/>
    </g>

    <!-- Header Brand b2bpro.store & Badge Num -->
    <g transform="translate(70, 75)">
      <rect width="180" height="36" rx="8" fill="#ffffff" fill-opacity="0.08" stroke="${t.neon1}" stroke-width="1"/>
      <circle cx="22" cy="18" r="6" fill="${t.neon1}"/>
      <text x="36" y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="1">B2BPRO.STORE</text>

      <g transform="translate(680, 0)">
        <rect width="180" height="36" rx="8" fill="${t.badgeBg}" stroke="${t.neon2}" stroke-width="1"/>
        <text x="90" y="23" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="${t.neon2}" text-anchor="middle">${escapeHtml(pin.shortTitle)}</text>
      </g>
    </g>

    <!-- Titre Intégral sans Coupure -->
    <g transform="translate(70, 155)">
      ${titleLines.map((line, idx) => `
        <text x="0" y="${idx * 56 + 48}" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
          ${escapeHtml(line)}
        </text>
      `).join("")}

      <!-- Badge Sous-titre -->
      <g transform="translate(0, ${titleLines.length * 56 + 60})">
        <rect width="480" height="38" rx="8" fill="#ffffff" fill-opacity="0.06" stroke="${t.accent}" stroke-width="1"/>
        <text x="18" y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="800" fill="${t.accent}">
          ⚡ LIVRABLE CLÉ EN MAIN • DÈS ${pin.price}€ GARANTI
        </text>
      </g>
    </g>

    <!-- Illustration Centrale 3D Spécialisée -->
    <g>
      ${renderCentralGraphic(pin.illustrationType, t)}
    </g>

    <!-- 3 Bénéfices Concrets Garantis -->
    <g transform="translate(80, 1020)">
      ${pin.benefits.map((b, idx) => `
        <g transform="translate(0, ${idx * 65})">
          <rect width="840" height="54" rx="10" fill="#080f24" fill-opacity="0.9" stroke="${t.neon1}" stroke-width="1" stroke-opacity="0.4"/>
          <circle cx="35" cy="27" r="14" fill="${t.neon1}" fill-opacity="0.2"/>
          <text x="35" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="900" fill="${t.neon1}" text-anchor="middle">✓</text>
          <text x="68" y="34" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" font-weight="700" fill="#f8fafc">
            ${escapeHtml(b)}
          </text>
        </g>
      `).join("")}
    </g>

    <!-- Social Proof & Garantie -->
    <g transform="translate(80, 1245)">
      <text x="0" y="22" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#94a3b8">
        ★ Vendeur Vérifié <tspan fill="#ffffff" font-weight="900">4.9/5</tspan> • Paiement 100% Séquestré
      </text>
      <g transform="translate(660, 0)">
        <rect width="180" height="32" rx="6" fill="#10e891" fill-opacity="0.15" stroke="#10e891" stroke-width="1"/>
        <text x="90" y="21" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#10e891" text-anchor="middle">⚡ COMMANDE IMMÉDIATE</text>
      </g>
    </g>

    <!-- Bouton CTA Géant Tactile 100% Mobile -->
    <g transform="translate(80, 1310)" filter="url(#glow)">
      <rect width="840" height="88" rx="18" fill="url(#btnGrad)" stroke="#ffffff" stroke-width="1.5"/>
      <text x="420" y="55" font-family="'Plus Jakarta Sans', sans-serif" font-size="26" font-weight="900" fill="#030712" text-anchor="middle" letter-spacing="0.5">
        COMMANDER EN 1 CLIC DÈS ${pin.price}€ ➔
      </text>
    </g>

    <defs>
      <linearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${t.neon1}"/>
        <stop offset="100%" stop-color="${t.accent}"/>
      </linearGradient>
    </defs>
  </svg>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function main() {
  console.log("🚀 Démarrage de la génération des 8 visuels uniques anti-doublon...\n");

  const csv8Rows: string[] = [];
  csv8Rows.push("Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords");

  for (let i = 0; i < MISSING_8_PINS.length; i++) {
    const pin = MISSING_8_PINS[i];
    console.log(`[${i + 1}/8] Génération du visuel #${pin.num} : ${pin.fullTitle}`);

    const svg = generateSvg(pin);
    const webpBuffer = await sharp(Buffer.from(svg))
      .resize(1000, 1500)
      .webp({ quality: 88, effort: 4 })
      .toBuffer();

    const outputPath = path.join(OUTPUT_DIR, pin.filename);
    writeFileSync(outputPath, webpBuffer);
    console.log(`  ✓ Enregistré : ${outputPath} (${(webpBuffer.length / 1024).toFixed(1)} Ko)`);

    const rawGithubUrl = `${GITHUB_RAW}/${pin.filename}`;
    const serviceUrl = `${BASE_URL}/services/${pin.slug}`;
    const pinTitle = `⚡ ${pin.fullTitle} - Dès ${pin.price}€`;

    const row = [
      `"${pinTitle.replace(/"/g, '""')}"`,
      `"${rawGithubUrl}"`,
      `"${pin.board.replace(/"/g, '""')}"`,
      `""`,
      `"${pin.description.replace(/"/g, '""')}"`,
      `"${serviceUrl}"`,
      `""`, // Publish date vide pour publication immédiate
      `"${pin.keywords.replace(/"/g, '""')}"`
    ].join(",");

    csv8Rows.push(row);
  }

  // 1. Sauvegarde du CSV dédié aux 8 épingles manquantes
  const csv8Content = csv8Rows.join("\n");
  writeFileSync(CSV_8_ROOT, csv8Content, "utf8");
  try {
    writeFileSync(CSV_8_DOWNLOADS, csv8Content, "utf8");
  } catch (e) {}

  console.log("\n✓ CSV dédié aux 8 épingles généré avec succès dans :");
  console.log(`  - ${CSV_8_ROOT}`);
  console.log(`  - ${CSV_8_DOWNLOADS}`);

  // 2. Mise à jour du CSV complet des 100 épingles
  console.log("\n✓ Mise à jour du CSV global des 100 épingles...");
  const oldCsvLines = existsSync(CSV_100_ROOT)
    ? require("fs").readFileSync(CSV_100_ROOT, "utf8").trim().split("\n")
    : [];

  if (oldCsvLines.length >= 93) {
    // Les 93 premières lignes (header + pins 1 à 92) restent inchangées
    const validFirst92 = oldCsvLines.slice(0, 93);
    // On remplace les 8 dernières lignes par les 8 nouvelles lignes
    const updated100 = [...validFirst92, ...csv8Rows.slice(1)];
    const updated100Content = updated100.join("\n");
    writeFileSync(CSV_100_ROOT, updated100Content, "utf8");
    writeFileSync(CSV_100_PUBLIC, updated100Content, "utf8");
    try {
      writeFileSync(CSV_100_DOWNLOADS, updated100Content, "utf8");
    } catch (e) {}
    console.log(`  - ${CSV_100_ROOT} mis à jour (${updated100.length} lignes)`);
  }

  console.log("\n=======================================================");
  console.log("🎉 LES 8 VISUELS UNIQUES ET LES CSV SONT PRÊTS !");
}

main().catch(console.error);
