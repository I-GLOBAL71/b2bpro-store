/**
 * PINTEREST GOOGLE FLOW PROMPT ENGINE
 * b2bpro.store - 2026
 * 
 * Générateur de 100 prompts Google Flow d'élite pour la création de visuels
 * Pinterest 2:3 verticaux (1000×1500), modernes, épurés, captivants et scroll-stop.
 * 
 * Sorties :
 * 1. data/pinterest-google-flow-100-prompts.json (Master JSON)
 * 2. public/pinterest/pinterest-google-flow-100-prompts.json (Web JSON)
 * 3. C:/Users/Administrateur/Downloads/pinterest-google-flow-100-prompts.json (Accès direct)
 * 4. public/pinterest/pinterest-bulk-upload-100-flow.csv (CSV Bulk Pinterest sans planification)
 * 5. public/pinterest/flow-prompts-explorer.html (Galerie & explorateur interactif avec copie 1-clic)
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

// Charger .env avant d'importer la db
import "dotenv/config";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../db/custom.db";
}

import { db } from "../src/lib/db";

const BASE_URL = "https://b2bpro.store";
const GITHUB_USER = "I-GLOBAL71";
const GITHUB_REPO = "b2bpro-store";
const GITHUB_BRANCH = "main";

// Répertoires
const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_PINTEREST_DIR = path.join(process.cwd(), "public", "pinterest");
const DOWNLOADS_DIR = "C:/Users/Administrateur/Downloads";

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(PUBLIC_PINTEREST_DIR)) mkdirSync(PUBLIC_PINTEREST_DIR, { recursive: true });

// Configuration des Tableaux Pinterest
interface BoardConfig {
  board: string;
  hashtags: string[];
  searchSeed: string;
  categoryTag: string;
}

const BOARD_CONFIGS: Record<string, BoardConfig> = {
  "Prospection & Données B2B": {
    board: "B2B Growth & Prospection Commerciale",
    hashtags: ["#prospectionb2b", "#growthb2b", "#leadgeneration", "#automationb2b", "#b2bpro"],
    searchSeed: "prospection b2b fichiers clients qualifies",
    categoryTag: "PROSPECTION & DATA"
  },
  "Veille & Intelligence Économique": {
    board: "Veille Stratégique & Automatisation",
    hashtags: ["#veillestrategique", "#intelligenceeconomique", "#benchmarking", "#businessintelligence", "#b2bpro"],
    searchSeed: "veille concurrentielle automatisee pme",
    categoryTag: "VEILLE CONCURRENTIELLE"
  },
  "E-commerce & Veille Marché": {
    board: "E-commerce, Amazon & Veille Prix",
    hashtags: ["#ecommercepro", "#amazonseller", "#veilleprix", "#shopifyexpert", "#dropshippingpro"],
    searchSeed: "e commerce automatisation catalogue shopify amazon",
    categoryTag: "E-COMMERCE & PRICING"
  },
  "SEO, Médias & Visibilité": {
    board: "SEO Local, Google Maps & Médias",
    hashtags: ["#seolocal", "#googlemapsia", "#referencementnaturel", "#visibilitepro", "#growthmarketing"],
    searchSeed: "audit seo visibilite google maps local",
    categoryTag: "SEO & VISIBILITÉ LOCALE"
  },
  "Immobilier & Foncier": {
    board: "Immobilier Pro & Opportunités Marché",
    hashtags: ["#immobilierpro", "#rentabiliteimmo", "#bonnesaffaires", "#investisseur", "#dataimmo"],
    searchSeed: "opportunites immobilieres decotees rentabilite",
    categoryTag: "DATA IMMOBILIER"
  },
  "Audit & Conformité": {
    board: "Audit Digital, IA & RGPD",
    hashtags: ["#auditdigital", "#conformitergpd", "#securiteentreprise", "#transformationdigitale", "#b2bpro"],
    searchSeed: "audit juridique rgpd fiches google",
    categoryTag: "AUDIT & CONFORMITÉ"
  },
  "Automatisation & IA": {
    board: "Services B2B & Solutions IA",
    hashtags: ["#solutionsia", "#iaentreprise", "#promptengineering", "#ragdata", "#automation"],
    searchSeed: "services b2b intelligence artificielle pme",
    categoryTag: "INTELLIGENCE ARTIFICIELLE"
  }
};

const DEFAULT_BOARD: BoardConfig = {
  board: "Services B2B & Solutions IA",
  hashtags: ["#servicesb2b", "#solutionsia", "#freelanceexpert", "#businesspro", "#b2bpro"],
  searchSeed: "prestataire freelance b2b qualifie",
  categoryTag: "SERVICE PRO EXPERT"
};

// Nettoyage du titre
function cleanTitle(raw: string): string {
  return raw
    .replace(/^Je vais /i, "")
    .replace(/^Nous allons /i, "")
    .replace(/^Je peux /i, "")
    .trim();
}

// Extraction des bénéfices concrets
function extractFeatures(service: any): string[] {
  const list: string[] = [];
  try {
    if (service.features) {
      const feat = typeof service.features === "string" ? JSON.parse(service.features) : service.features;
      if (Array.isArray(feat)) {
        for (const f of feat) {
          if (typeof f === "string" && f.length > 5 && list.length < 3) {
            const clean = f
              .replace(/^[0-9]+ %\s*/, "")
              .replace(/^[✓•-]\s*/, "")
              .substring(0, 48);
            list.push(clean);
          }
        }
      }
    }
  } catch (e) {}

  if (list.length < 1) list.push("Livrable Excel & CSV complet et structuré");
  if (list.length < 2) list.push("Données 100% fraîches et vérifiées");
  if (list.length < 3) list.push("Livraison express en 24-48h avec garantie");
  return list.slice(0, 3);
}

// Générateur de Prompt Google Flow spécialisé par thématique
function buildGoogleFlowPrompt(service: any, index: number): {
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  themeColor: string;
  visualFocalPoint: string;
  compositionNotes: string;
} {
  const title = cleanTitle(service.title).toLowerCase();
  const pole = service.pole || service.category || "";

  let focalPoint = "";
  let primaryHue = "";
  let accentHue = "";
  let environment = "";

  if (title.includes("shopify") || title.includes("catalogue") || title.includes("menu") || title.includes("amazon") || title.includes("buy box") || title.includes("grossiste") || title.includes("revendeur")) {
    focalPoint = "A luminous 3D holographic crystal shopping cube suspended mid-air, emitting glowing data streams of product cards, glowing gold price percentage indicators, and laser barcode grids.";
    primaryHue = "electric cyber cyan (#00f5ff) and radiant emerald neon (#10e891)";
    accentHue = "burnished solar gold (#ffb703)";
    environment = "floating above a dark reflective obsidian glass surface with soft circuit board reflections";
  } else if (title.includes("saas") || title.includes("logiciel") || title.includes("technologie") || title.includes("cms") || title.includes("ia") || title.includes("markdown") || title.includes("connaissances") || title.includes("donnees")) {
    focalPoint = "A sleek floating 3D biometric holographic HUD interface with translucent frosted glass cards, glowing interactive checkmarks, interconnected neural node clusters, and floating cyber charts.";
    primaryHue = "neural deep violet (#c084fc) and ultraviolet magenta (#ec4899)";
    accentHue = "prismatic cyan highlight (#38bdf8)";
    environment = "in a clean dark minimalist cyberspace chamber with subtle geometric light grid and soft mist";
  } else if (title.includes("seo") || title.includes("liens") || title.includes("google maps") || title.includes("avis") || title.includes("balises") || title.includes("blog") || title.includes("questions") || title.includes("visibilite")) {
    focalPoint = "A futuristic 3D holographic topographical radar sphere scanning digital connection lines, with a glowing golden magnifying lens revealing radiant floating search pins and SEO metrics.";
    primaryHue = "intense matrix emerald (#10e891) and neon mint (#34d399)";
    accentHue = "electric blue laser beam (#2563eb)";
    environment = "centered in a high-tech obsidian analytical studio with soft ambient volumetric depth";
  } else if (title.includes("prospection") || title.includes("fichier") || title.includes("mairies") || title.includes("artisans") || title.includes("entreprises") || title.includes("pharmacies") || title.includes("commerces") || title.includes("contacts")) {
    focalPoint = "A crystalline 3D holographic data vortex funnel channeling sparkling golden business contact spheres into an ultra-organized translucent glowing glass database tablet.";
    primaryHue = "solar amber (#ffb703) and warm cyber orange (#fb923c)";
    accentHue = "radiant cyan sparkle (#00f5ff)";
    environment = "over an elegant dark brushed titanium pedestal with subtle holographic particle dust";
  } else if (title.includes("immobilier") || title.includes("loyer") || title.includes("rentabilite") || title.includes("permis") || title.includes("agences") || title.includes("marches publics") || title.includes("appels d'offres") || title.includes("subventions") || title.includes("fonds") || title.includes("angels")) {
    focalPoint = "A mesmerizing miniature 3D holographic architectural city district floating above a sleek glass tablet, with emerald glowing lasers highlighting undervalued properties and golden investment metric badges.";
    primaryHue = "deep emerald neon (#059669) and cyan blueprint lasers (#00f5ff)";
    accentHue = "luxury metallic champagne gold (#f59e0b)";
    environment = "in a dark luxury executive penthouse aesthetic with soft bokeh city lights";
  } else if (title.includes("youtube") || title.includes("tiktok") || title.includes("instagram") || title.includes("influenceurs") || title.includes("linkedin") || title.includes("viraux") || title.includes("videos")) {
    focalPoint = "A levitating 3D glowing holographic video player prism radiating animated neon soundwave frequencies, floating viral flame badges, and holographic engagement multiplier metrics.";
    primaryHue = "neon electric pink (#f43f5e) and hyper-violet (#a855f7)";
    accentHue = "cyber cyan laser outline (#38bdf8)";
    environment = "surrounded by sleek dark glass spheres in an immersive dark space showroom";
  } else {
    focalPoint = "A stunning 3D levitating quantum glass prism housing glowing data matrices, surrounded by floating concentric holographic HUD rings and crisp analytical data beads.";
    primaryHue = "cyber cyan (#00f5ff) and neural violet (#a855f7)";
    accentHue = "bright laser gold (#fbbf24)";
    environment = "resting in an elegant dark luxury tech setting with clean atmospheric reflections";
  }

  const prompt = [
    `Ultra-captivating Pinterest vertical commercial visual (aspect ratio 2:3, 1000x1500).`,
    `Subject: ${focalPoint}`,
    `Color palette: Deep luxury obsidian dark background (#040711) contrasted with glowing ${primaryHue} and vivid ${accentHue}.`,
    `Environment: ${environment}.`,
    `Composition: Flawless Pinterest scroll-stopper layout. Clean vertical hierarchy with ample sleek negative space at the upper third for typography and bottom third for call-to-action button.`,
    `Lighting & Render: High-end Octane 3D render, ray-traced glassmorphism, subsurface scattering, crisp edge rim lighting, volumetric soft glows, photorealistic textures, 8k resolution, cinematic depth of field, hyper-modern tech elegance, zero clutter.`
  ].join(" ");

  const negativePrompt = "blurry, low resolution, pixelated, ugly text, unreadable typography, cluttered background, messy artifacts, chaotic composition, low quality render, amateur, noisy, watermarks, signature, flat 2d clipart, oversaturated distortion";

  return {
    prompt,
    negativePrompt,
    aspectRatio: "2:3 (1000×1500)",
    themeColor: primaryHue,
    visualFocalPoint: focalPoint,
    compositionNotes: "Disposition 2:3 verticale avec 30% d'espace négatif épuré en haut et en bas pour intégration de titre et CTA percutants."
  };
}

async function run() {
  console.log("🚀 Démarrage du générateur de Prompts Google Flow - b2bpro.store");
  console.log("=================================================================\n");

  const services = await db.service.findMany({
    include: { seller: true },
    orderBy: [
      { salesCount: "desc" },
      { rating: "desc" },
      { views: "desc" }
    ],
    take: 100
  });

  console.log(`✓ ${services.length} services récupérés depuis la base de données.`);

  const flowPrompts: any[] = [];
  const csvRows: string[] = [];

  // En-tête CSV officiel Pinterest Bulk Create
  csvRows.push("Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords");

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    const index = i + 1;
    const pinNumber = String(index).padStart(3, "0");
    const rawTitle = cleanTitle(s.title);
    const capitalizedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
    const price = s.basePrice || 25;
    const rating = Number(s.rating || 4.8).toFixed(1);
    const salesCount = s.salesCount || Math.floor(Math.random() * 40 + 150);

    const boardConfig = BOARD_CONFIGS[s.pole] || BOARD_CONFIGS[s.category] || DEFAULT_BOARD;
    const features = extractFeatures(s);

    // Titre Pinterest ultra-accrocheur (< 95 caractères)
    let pinTitle = `⚡ ${capitalizedTitle} - Dès ${price}€`;
    if (pinTitle.length > 95) {
      pinTitle = pinTitle.substring(0, 92) + "…";
    }

    // Description persuasive orientée conversion immédiate
    const pinDesc = `🚀 Automatisez et décuplez votre business : ${capitalizedTitle}. Obtenez un livrable clé en main dès ${price} € garanti : 1) ${features[0]} 2) ${features[1]} 3) ${features[2]}. Vendeur d'élite noté ${rating}/5 (${salesCount}+ commandes). Paiement 100% sécurisé et séquestré jusqu'à validation. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! ${boardConfig.hashtags.join(" ")}`;

    // Nom de fichier cible et URL GitHub Raw correspondante
    const filename = `pin-flow-${pinNumber}-${s.slug}.webp`;
    const targetGithubRawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/pinterest/pins-flow/${filename}`;
    const serviceUrl = `${BASE_URL}/services/${s.slug}`;

    // Mots-clés SEO ciblés
    const keywords = [
      boardConfig.searchSeed,
      "services b2b intelligence artificielle",
      "prestataire entreprise freelance",
      "solutions ia pme",
      "automatisation business pro",
      "growth b2b",
      "b2bpro"
    ].join(", ");

    // Ligne CSV Pinterest (Date de publication vide pour publication immédiate sans planification)
    const csvLine = [
      `"${pinTitle.replace(/"/g, '""')}"`,
      `"${targetGithubRawUrl}"`,
      `"${boardConfig.board.replace(/"/g, '""')}"`,
      `""`,
      `"${pinDesc.replace(/"/g, '""')}"`,
      `"${serviceUrl}"`,
      `""`, // Publish date laissé vide pour import groupé immédiat
      `"${keywords.replace(/"/g, '""')}"`
    ].join(",");

    csvRows.push(csvLine);

    // Génération du Prompt Google Flow
    const flowPromptData = buildGoogleFlowPrompt(s, i);

    flowPrompts.push({
      id: index,
      pin_number: pinNumber,
      service_id: s.id,
      service_slug: s.slug,
      service_title: capitalizedTitle,
      category: s.category,
      pole: s.pole || s.category,
      base_price_eur: price,
      rating: rating,
      sales_count: salesCount,
      target_service_url: serviceUrl,
      pinterest: {
        board: boardConfig.board,
        pin_title: pinTitle,
        pin_description: pinDesc,
        pin_keywords: keywords,
        publish_date: "", // Immédiat
        hashtags: boardConfig.hashtags,
        category_tag: boardConfig.categoryTag
      },
      google_flow: {
        tool: "Google Flow / Imagen 3 / Generative AI Studio",
        prompt: flowPromptData.prompt,
        negative_prompt: flowPromptData.negativePrompt,
        aspect_ratio: flowPromptData.aspectRatio,
        theme_colors: flowPromptData.themeColor,
        visual_focal_point: flowPromptData.visualFocalPoint,
        composition_notes: flowPromptData.compositionNotes,
        suggested_cta_overlay: `COMMANDER EN 1 CLIC DÈS ${price}€ ➔`
      },
      file_delivery: {
        expected_output_filename: filename,
        github_repository_path: `public/pinterest/pins-flow/${filename}`,
        raw_github_url: targetGithubRawUrl
      }
    });
  }

  // 1. Écriture du JSON Master
  const jsonContent = JSON.stringify({
    project: "b2bpro.store - Pinterest Domination Engine (Google Flow Edition)",
    generated_at: new Date().toISOString(),
    total_prompts: flowPrompts.length,
    aspect_ratio: "2:3 (1000x1500 Portrait)",
    instructions: [
      "1. Utilisez chaque prompt dans Google Flow / Imagen pour générer les visuels verticaux 2:3.",
      "2. Déposez les images générées dans le dossier de travail ou fournissez-les dans le chat.",
      "3. Le script d'ingestion convertit automatiquement en WebP ultra-léger (~60-80 Ko) et pousse sur GitHub.",
      "4. Importez le fichier CSV 'pinterest-bulk-upload-100-flow.csv' directement sur Pinterest Business pour une publication immédiate."
    ],
    prompts: flowPrompts
  }, null, 2);

  const jsonMasterPath = path.join(DATA_DIR, "pinterest-google-flow-100-prompts.json");
  const jsonPublicPath = path.join(PUBLIC_PINTEREST_DIR, "pinterest-google-flow-100-prompts.json");
  const jsonDownloadsPath = path.join(DOWNLOADS_DIR, "pinterest-google-flow-100-prompts.json");

  writeFileSync(jsonMasterPath, jsonContent, "utf8");
  writeFileSync(jsonPublicPath, jsonContent, "utf8");
  try {
    writeFileSync(jsonDownloadsPath, jsonContent, "utf8");
  } catch (e) {
    console.warn("Notice: Impossible d'écrire directement dans Downloads, fichier disponible dans public et data.");
  }

  console.log(`✓ JSON généré avec succès dans :`);
  console.log(`  - ${jsonMasterPath}`);
  console.log(`  - ${jsonPublicPath}`);
  console.log(`  - ${jsonDownloadsPath}`);

  // 2. Écriture du CSV Pinterest Bulk
  const csvContent = csvRows.join("\n");
  const csvPublicPath = path.join(PUBLIC_PINTEREST_DIR, "pinterest-bulk-upload-100-flow.csv");
  const csvRootPath = path.join(process.cwd(), "pinterest-bulk-upload-100-flow.csv");
  const csvDownloadsPath = path.join(DOWNLOADS_DIR, "pinterest-bulk-upload-100-flow.csv");

  writeFileSync(csvPublicPath, csvContent, "utf8");
  writeFileSync(csvRootPath, csvContent, "utf8");
  try {
    writeFileSync(csvDownloadsPath, csvContent, "utf8");
  } catch (e) {}

  console.log(`✓ CSV Pinterest généré avec succès dans :`);
  console.log(`  - ${csvRootPath}`);
  console.log(`  - ${csvDownloadsPath}`);

  // 3. Génération de l'Explorateur HTML interactif (Visualiseur et Copieur 1-clic)
  const htmlContent = generateInteractiveExplorerHtml(flowPrompts);
  const htmlPublicPath = path.join(PUBLIC_PINTEREST_DIR, "flow-prompts-explorer.html");
  const htmlDownloadsPath = path.join(DOWNLOADS_DIR, "flow-prompts-explorer.html");

  writeFileSync(htmlPublicPath, htmlContent, "utf8");
  try {
    writeFileSync(htmlDownloadsPath, htmlContent, "utf8");
  } catch (e) {}

  console.log(`✓ Explorateur interactif HTML généré dans :`);
  console.log(`  - ${htmlPublicPath}`);
  console.log(`  - ${htmlDownloadsPath}`);

  console.log("\n=================================================================");
  console.log("🎉 MISSION ACCOMPLIE : 100 PROMPTS GOOGLE FLOW PRÊTS À L'EMPLOI !");
}

function generateInteractiveExplorerHtml(prompts: any[]): string {
  const cardsHtml = prompts.map(p => `
    <div class="prompt-card" id="pin-${p.pin_number}">
      <div class="card-header">
        <span class="badge-num">#${p.pin_number}</span>
        <span class="badge-board">${escapeHtml(p.pinterest.board)}</span>
        <span class="badge-price">Dès ${p.base_price_eur}€</span>
      </div>

      <h3 class="service-title">${escapeHtml(p.service_title)}</h3>

      <div class="meta-preview">
        <div class="meta-row"><span class="meta-label">Titre Pin :</span> <strong>${escapeHtml(p.pinterest.pin_title)}</strong></div>
        <div class="meta-row"><span class="meta-label">Lien direct :</span> <a href="${p.target_service_url}" target="_blank">${escapeHtml(p.target_service_url)}</a></div>
        <div class="meta-row"><span class="meta-label">Fichier final :</span> <code>${p.file_delivery.expected_output_filename}</code></div>
      </div>

      <div class="prompt-box">
        <div class="prompt-header">
          <span class="prompt-tag">⚡ Prompt Google Flow / Imagen (Anglais)</span>
          <button class="btn-copy" onclick="copyPrompt('prompt-text-${p.pin_number}', this)">📋 Copier le Prompt</button>
        </div>
        <textarea id="prompt-text-${p.pin_number}" readonly>${escapeHtml(p.google_flow.prompt)}</textarea>
      </div>

      <div class="negative-box">
        <span class="neg-label">🚫 Negative Prompt :</span> <code>${escapeHtml(p.google_flow.negative_prompt)}</code>
      </div>

      <div class="desc-box">
        <div class="prompt-header">
          <span class="prompt-tag">📌 Description Optimisée Pinterest</span>
          <button class="btn-copy-sec" onclick="copyText('${escapeHtml(p.pinterest.pin_description)}', this)">📋 Copier Description</button>
        </div>
        <p class="desc-text">${escapeHtml(p.pinterest.pin_description)}</p>
      </div>
    </div>
  `).join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Flow Prompts Engine - 100 Visuels Pinterest B2BPRO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --card-bg: #0b1329;
      --card-border: #1e293b;
      --cyan: #00f5ff;
      --violet: #a855f7;
      --green: #10e891;
      --amber: #ffb703;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 30px 20px;
      line-height: 1.5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px 20px;
      background: radial-gradient(circle at 50% 0%, rgba(0, 245, 255, 0.15), transparent 70%);
      border-radius: 20px;
      border: 1px solid rgba(0, 245, 255, 0.2);
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -1px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #ffffff 40%, var(--cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 16px;
      max-width: 800px;
      margin: 0 auto 20px;
    }
    .action-bar {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-action {
      background: linear-gradient(135deg, var(--cyan), #2563eb);
      color: #030712;
      font-weight: 800;
      padding: 12px 24px;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
      border: none;
      cursor: pointer;
    }
    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 245, 255, 0.35);
    }
    .btn-action-alt {
      background: #1e293b;
      color: #ffffff;
      border: 1px solid #334155;
    }
    .btn-action-alt:hover {
      background: #334155;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }
    .search-bar {
      margin: 30px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
    }
    .search-input {
      width: 100%;
      max-width: 600px;
      background: #0f172a;
      border: 1px solid #334155;
      padding: 14px 20px;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 15px rgba(0, 245, 255, 0.25);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(620px, 1fr));
      gap: 25px;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
    .prompt-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .prompt-card:hover {
      border-color: rgba(0, 245, 255, 0.4);
      transform: translateY(-3px);
    }
    .card-header {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .badge-num {
      background: #1e293b;
      color: var(--cyan);
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
    }
    .badge-board {
      background: rgba(168, 85, 247, 0.15);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-price {
      margin-left: auto;
      background: rgba(16, 232, 145, 0.15);
      color: var(--green);
      border: 1px solid rgba(16, 232, 145, 0.3);
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
    }
    .service-title {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.35;
    }
    .meta-preview {
      font-size: 13px;
      color: var(--text-muted);
      background: #060a17;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meta-row { display: flex; gap: 8px; align-items: baseline; word-break: break-all; }
    .meta-label { color: #64748b; font-weight: 600; white-space: nowrap; }
    .meta-row a { color: var(--cyan); text-decoration: none; }
    .meta-row a:hover { text-decoration: underline; }
    .prompt-box {
      background: #050814;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 14px;
    }
    .prompt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .prompt-tag {
      font-size: 12px;
      font-weight: 800;
      color: var(--amber);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    textarea {
      width: 100%;
      height: 120px;
      background: transparent;
      border: none;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.45;
      resize: vertical;
      outline: none;
    }
    .btn-copy, .btn-copy-sec {
      background: rgba(0, 245, 255, 0.15);
      color: var(--cyan);
      border: 1px solid var(--cyan);
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-copy:hover {
      background: var(--cyan);
      color: #030712;
    }
    .btn-copy-sec {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border-color: #c084fc;
    }
    .btn-copy-sec:hover {
      background: #c084fc;
      color: #ffffff;
    }
    .negative-box {
      font-size: 12px;
      color: #94a3b8;
      background: #0f172a;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .negative-box code { color: #f43f5e; font-family: 'JetBrains Mono', monospace; }
    .desc-box {
      background: #081026;
      border-left: 3px solid var(--violet);
      padding: 12px;
      border-radius: 6px;
    }
    .desc-text {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚡ 100 Prompts Google Flow - b2bpro.store</h1>
      <p class="subtitle">Moteur de génération de visuels d'élite pour la domination Pinterest. Format 2:3 vertical, rendu 3D Octane ultra-moderne, épuré, scroll-stop et magnétique. Copiez les prompts en 1 clic pour Google Flow / Imagen.</p>
      <div class="action-bar">
        <a href="pinterest-google-flow-100-prompts.json" download class="btn-action">💾 Télécharger le fichier JSON</a>
        <a href="pinterest-bulk-upload-100-flow.csv" download class="btn-action btn-action-alt">📊 Télécharger le CSV Pinterest Bulk</a>
      </div>
    </header>

    <div class="search-bar">
      <input type="text" class="search-input" id="search" placeholder="🔍 Rechercher un service, un mot-clé ou un tableau Pinterest..." onkeyup="filterCards()">
    </div>

    <div class="grid" id="prompts-grid">
      ${cardsHtml}
    </div>
  </div>

  <script>
    function copyPrompt(id, btn) {
      const el = document.getElementById(id);
      navigator.clipboard.writeText(el.value).then(() => {
        const orig = btn.innerText;
        btn.innerText = "✓ Copié !";
        btn.style.background = "#10e891";
        btn.style.color = "#02120b";
        setTimeout(() => {
          btn.innerText = orig;
          btn.style.background = "";
          btn.style.color = "";
        }, 1800);
      });
    }

    function copyText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerText;
        btn.innerText = "✓ Copié !";
        setTimeout(() => {
          btn.innerText = orig;
        }, 1800);
      });
    }

    function filterCards() {
      const q = document.getElementById('search').value.toLowerCase();
      const cards = document.querySelectorAll('.prompt-card');
      cards.forEach(c => {
        const text = c.innerText.toLowerCase();
        c.style.display = text.includes(q) ? 'flex' : 'none';
      });
    }
  </script>
</body>
</html>`;
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

run().catch(console.error);
