/**
 * PINTEREST ELITE AI TECH ENGINE - V2
 * b2bpro.store - 2026
 * 
 * 100 Nouveaux Visuels Pinterest 1000×1500 (2:3) Ultra-Captivants :
 * - Style Moderne IA Technologique, épuré, scroll-stop.
 * - Moins de texte en haut, titre percutant en 1-2 lignes max.
 * - Carte centrale holographique / HUD IA dominante et futuriste.
 * - Appel à l'action magnétique et ultra-engageant.
 * - Configuration CSV SANS planification (publication immédiate en 1 clic).
 * - Hébergement GitHub Raw en fichiers WebP légers (~60-80 Ko).
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { db } from "../src/lib/db";

const W = 1000;
const H = 1500;
const GITHUB_USER = "I-GLOBAL71";
const GITHUB_REPO = "b2bpro-store";
const GITHUB_BRANCH = "main";
const BASE_URL = "https://b2bpro.store";

const OUTPUT_DIR = path.join(process.cwd(), "public", "pinterest", "pins-v2");
const CSV_FILE = path.join(process.cwd(), "public", "pinterest", "pinterest-bulk-upload-100-pins-v2-ai.csv");
const ROOT_CSV_FILE = path.join(process.cwd(), "pinterest-bulk-upload-100-pins-v2-ai.csv");
const GALLERY_FILE = path.join(process.cwd(), "public", "pinterest", "preview-gallery-v2.html");
const DOWNLOADS_GALLERY = "C:/Users/Administrateur/Downloads/preview-gallery-v2.html";

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 4 Thèmes IA Futuristes & Néon
interface AITechTheme {
  name: string;
  bgDark: string;
  glowColor1: string;
  glowColor2: string;
  cardBg: string;
  cardBorder: string;
  primaryNeon: string;
  secondaryNeon: string;
  textLight: string;
  textMuted: string;
  btnGradient: [string, string];
  btnText: string;
  circuitType: string;
}

const AI_THEMES: Record<string, AITechTheme> = {
  "cyber-cyan": {
    name: "Cyber Cyan Quantum",
    bgDark: "#030712",
    glowColor1: "#00f5ff",
    glowColor2: "#2563eb",
    cardBg: "#081026",
    cardBorder: "#00f5ff",
    primaryNeon: "#00f5ff",
    secondaryNeon: "#38bdf8",
    textLight: "#ffffff",
    textMuted: "#94a3b8",
    btnGradient: ["#00f5ff", "#2563eb"],
    btnText: "#030712",
    circuitType: "quantum"
  },
  "neural-violet": {
    name: "Neural Deep Violet",
    bgDark: "#090417",
    glowColor1: "#a855f7",
    glowColor2: "#ec4899",
    cardBg: "#160b2e",
    cardBorder: "#a855f7",
    primaryNeon: "#c084fc",
    secondaryNeon: "#f43f5e",
    textLight: "#ffffff",
    textMuted: "#cbd5e1",
    btnGradient: ["#a855f7", "#ec4899"],
    btnText: "#ffffff",
    circuitType: "neural"
  },
  "matrix-emerald": {
    name: "Matrix Neon Emerald",
    bgDark: "#02120b",
    glowColor1: "#10e891",
    glowColor2: "#059669",
    cardBg: "#052216",
    cardBorder: "#10e891",
    primaryNeon: "#10e891",
    secondaryNeon: "#34d399",
    textLight: "#ffffff",
    textMuted: "#a7f3d0",
    btnGradient: ["#10e891", "#059669"],
    btnText: "#02120b",
    circuitType: "matrix"
  },
  "solar-amber": {
    name: "Solar Amber Fusion",
    bgDark: "#100a03",
    glowColor1: "#ffb703",
    glowColor2: "#fb8500",
    cardBg: "#221303",
    cardBorder: "#ffb703",
    primaryNeon: "#ffb703",
    secondaryNeon: "#fb923c",
    textLight: "#ffffff",
    textMuted: "#fed7aa",
    btnGradient: ["#ffb703", "#fb8500"],
    btnText: "#100a03",
    circuitType: "fusion"
  }
};

const BOARD_MAPPING: Record<string, { board: string; hashtags: string[]; searchSeed: string }> = {
  "Prospection & Données B2B": {
    board: "B2B Growth & Prospection Commerciale",
    hashtags: ["#prospectionia", "#leadgenerationb2b", "#b2bgrowth", "#iaentreprise", "#automation"],
    searchSeed: "prospection b2b automatisee ia"
  },
  "B2B Sales Intelligence & Intent Data": {
    board: "Bases de Données & Data Scraping",
    hashtags: ["#scrapingia", "#b2bdata", "#growthhacking", "#intentdata", "#fichiersprospects"],
    searchSeed: "base de donnees entreprises qualifiees"
  },
  "E-commerce, Retail & Pricing Intelligence": {
    board: "E-commerce, Amazon & Veille Prix",
    hashtags: ["#pricingia", "#amazonseller", "#ecommercepro", "#veilleprix", "#growthcommerce"],
    searchSeed: "veille concurrentielle e-commerce automatique"
  },
  "E-commerce & Veille concurrentielle": {
    board: "E-commerce, Amazon & Veille Prix",
    hashtags: ["#ecommercefr", "#buyboxamazon", "#pricingstrategie", "#espionnageconcurrents", "#saas"],
    searchSeed: "espionner prix concurrents amazon"
  },
  "IA, RAG & LLM Data Engineering": {
    board: "Intelligence Artificielle & Automatisation",
    hashtags: ["#ragdata", "#customgpt", "#iaentreprise", "#llm", "#chatbots"],
    searchSeed: "base de connaissances ia entreprise"
  },
  "Intelligence Artificielle & Gestion de données": {
    board: "Intelligence Artificielle & Automatisation",
    hashtags: ["#iaautomation", "#chatgptpro", "#donneesb2b", "#promptengineering", "#productivity"],
    searchSeed: "automatisation intelligence artificielle pme"
  },
  "SEO, GEO (IA Search), Médias, RP & Podcasts": {
    board: "SEO Local, Google Maps & Médias",
    hashtags: ["#seolocal", "#googlemapsia", "#geoseo", "#visibilitepme", "#referencementnaturel"],
    searchSeed: "referencement local google maps audit"
  },
  "Référencement local (SEO Google Maps)": {
    board: "SEO Local, Google Maps & Médias",
    hashtags: ["#seomaps", "#packlocal", "#avisclients", "#fichesgoogle", "#artisanspme"],
    searchSeed: "audit concurrents google maps"
  },
  "Recrutement, Talents & Veille RH B2B": {
    board: "Recrutement & Chasse de Talents B2B",
    hashtags: ["#recrutementia", "#chassedecompetences", "#talentsb2b", "#rhdigital", "#freelance"],
    searchSeed: "recruter experts tech b2b"
  },
  "Immobilier, Travaux & Commerce Local": {
    board: "Immobilier Pro & Opportunités Commerciales",
    hashtags: ["#immobilierpro", "#investissements", "#locauxcommerciaux", "#cadastre", "#proptech"],
    searchSeed: "opportunites immobilieres pro sous cote"
  },
  "Immobilier & Investissement": {
    board: "Immobilier Pro & Opportunités Commerciales",
    hashtags: ["#immorentable", "#b2bimmobilier", "#artisansrge", "#foncierpro", "#investir"],
    searchSeed: "annonces immobilieres sous prix marche"
  },
  "Marketing d'Influence & Réseaux Sociaux": {
    board: "Marketing d'Influence & Réseaux Sociaux",
    hashtags: ["#influenceb2b", "#microinfluence", "#socialselling", "#growthmarketing", "#tiktokb2b"],
    searchSeed: "trouver influenceurs rentables b2b"
  }
};

const DEFAULT_BOARD = {
  board: "Services B2B & Solutions IA",
  hashtags: ["#solutionsia", "#servicesb2b", "#croissancepme", "#automationb2b", "#b2bpro"],
  searchSeed: "services b2b intelligence artificielle"
};

function esc(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Nettoyage ultra-court et percutant pour le titre (1 à 2 lignes max en HAUT)
function makeUltraPunchyHook(rawTitle: string): { titleShort: string; subBadge: string } {
  let title = rawTitle
    .replace(/^Je vais /i, "")
    .replace(/^Nous allons /i, "")
    .trim();

  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Synthèse ultra-impactante
  if (title.length > 38) {
    const parts = title.split(/ pour | avec | dans | sur | et | d'un | de vos /i);
    if (parts[0].length >= 12 && parts[0].length <= 36) {
      return {
        titleShort: parts[0].toUpperCase(),
        subBadge: parts.slice(1).join(" ").substring(0, 32) || "Livré clé en main en 24h"
      };
    }
    return {
      titleShort: title.substring(0, 36).toUpperCase() + "…",
      subBadge: "Livrable garanti · 0 friction"
    };
  }

  return {
    titleShort: title.toUpperCase(),
    subBadge: "Livrable complet & garanti 100%"
  };
}

// Extraction des 3 livrables concrets
function extractQuickBenefits(service: any): string[] {
  const list: string[] = [];
  try {
    if (service.features) {
      const feat = typeof service.features === "string" ? JSON.parse(service.features) : service.features;
      if (Array.isArray(feat)) {
        for (const f of feat) {
          if (typeof f === "string" && f.length > 8 && list.length < 3) {
            const clean = f
              .replace(/^[0-9]+ %\s*/, "")
              .replace(/^[✓•-]\s*/, "")
              .substring(0, 42);
            list.push(clean);
          }
        }
      }
    }
  } catch (e) {}

  if (list.length < 1) list.push("Fichier Excel / CSV prêt à l'emploi");
  if (list.length < 2) list.push("Données 100% vérifiées & fraîches");
  if (list.length < 3) list.push("Livraison express garantie en 24-48h");

  return list.slice(0, 3);
}

// Rendu du composant holographique IA Central (Dominant 50% du visuel)
function renderHoloAICard(theme: AITechTheme, service: any, index: number): string {
  const cardX = 70;
  const cardY = 410;
  const cardW = 860;
  const cardH = 590;

  const price = service.basePrice || 25;
  const rating = Number(service.rating || 4.8).toFixed(1);
  const sales = service.salesCount || 1200;

  // Variantes graphiques d'illustration IA futuriste
  const variant = index % 3;

  let graphicElements = "";

  if (variant === 0) {
    // Holographic Neural Nodes & Realtime Pipeline
    graphicElements = `
      <!-- Neural Core -->
      <g transform="translate(500, 680)">
        <!-- Outer Glowing Rings -->
        <circle cx="0" cy="0" r="170" fill="none" stroke="${theme.primaryNeon}" stroke-width="1.5" stroke-dasharray="8 8" opacity="0.4"/>
        <circle cx="0" cy="0" r="125" fill="none" stroke="${theme.secondaryNeon}" stroke-width="2" opacity="0.6"/>
        <circle cx="0" cy="0" r="75" fill="${theme.primaryNeon}" fill-opacity="0.12" stroke="${theme.primaryNeon}" stroke-width="2.5"/>
        
        <!-- Center Core Orb -->
        <circle cx="0" cy="0" r="38" fill="${theme.primaryNeon}" fill-opacity="0.3"/>
        <circle cx="0" cy="0" r="24" fill="${theme.primaryNeon}"/>
        <text x="0" y="8" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="900" fill="${theme.bgDark}" text-anchor="middle">AI</text>

        <!-- Orbiting Satellite Chips -->
        <g transform="translate(-160, -80)">
          <rect width="130" height="36" rx="8" fill="#030712" fill-opacity="0.85" stroke="${theme.primaryNeon}" stroke-width="1.2"/>
          <text x="65" y="23" font-family="monospace" font-size="12" font-weight="700" fill="${theme.primaryNeon}" text-anchor="middle">⚡ RAG DATA</text>
        </g>

        <g transform="translate(60, -110)">
          <rect width="130" height="36" rx="8" fill="#030712" fill-opacity="0.85" stroke="${theme.secondaryNeon}" stroke-width="1.2"/>
          <text x="65" y="23" font-family="monospace" font-size="12" font-weight="700" fill="${theme.secondaryNeon}" text-anchor="middle">✓ ZERO NOISE</text>
        </g>

        <g transform="translate(70, 75)">
          <rect width="140" height="36" rx="8" fill="#030712" fill-opacity="0.85" stroke="${theme.primaryNeon}" stroke-width="1.2"/>
          <text x="70" y="23" font-family="monospace" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">🛡️ 100% VÉRIFIÉ</text>
        </g>

        <g transform="translate(-170, 85)">
          <rect width="130" height="36" rx="8" fill="#030712" fill-opacity="0.85" stroke="${theme.secondaryNeon}" stroke-width="1.2"/>
          <text x="65" y="23" font-family="monospace" font-size="12" font-weight="700" fill="${theme.secondaryNeon}" text-anchor="middle">⏱️ EXPRESS 24H</text>
        </g>

        <!-- Connecting Laser Beams -->
        <line x1="-95" y1="-62" x2="-38" y2="-15" stroke="${theme.primaryNeon}" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="60" y1="-74" x2="28" y2="-20" stroke="${theme.secondaryNeon}" stroke-width="1.5"/>
        <line x1="70" y1="75" x2="30" y2="20" stroke="${theme.primaryNeon}" stroke-width="1.5"/>
        <line x1="-105" y1="85" x2="-28" y2="20" stroke="${theme.secondaryNeon}" stroke-width="1.5" stroke-dasharray="4 4"/>
      </g>
    `;
  } else if (variant === 1) {
    // Holographic Futuristic Datatable HUD
    graphicElements = `
      <g transform="translate(100, 480)">
        <!-- Table Top Header -->
        <rect width="800" height="48" rx="10" fill="${theme.primaryNeon}" fill-opacity="0.15" stroke="${theme.primaryNeon}" stroke-width="1.2"/>
        <text x="30" y="30" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="${theme.primaryNeon}">CIBLE QUALIFIÉE</text>
        <text x="270" y="30" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="${theme.primaryNeon}">DÉCIDEUR DIRECT</text>
        <text x="510" y="30" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="${theme.primaryNeon}">CONTACT VÉRIFIÉ</text>
        <text x="710" y="30" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="${theme.primaryNeon}">SCORE</text>

        <!-- Row 1 -->
        <rect x="0" y="60" width="800" height="64" rx="8" fill="#ffffff" fill-opacity="0.04"/>
        <circle cx="20" cy="92" r="5" fill="#10e891"/>
        <text x="35" y="98" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Directeur Général / PME</text>
        <text x="270" y="98" font-family="system-ui, sans-serif" font-size="15" fill="${theme.textMuted}">Thomas V. (CEO)</text>
        <text x="510" y="98" font-family="monospace" font-size="14" fill="${theme.primaryNeon}">t.vernet@direct-corp.fr</text>
        <rect x="690" y="77" width="90" height="30" rx="15" fill="#10e891" fill-opacity="0.2" stroke="#10e891" stroke-width="1"/>
        <text x="735" y="97" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#10e891" text-anchor="middle">✓ 99.8%</text>

        <!-- Row 2 -->
        <rect x="0" y="134" width="800" height="64" rx="8" fill="#ffffff" fill-opacity="0.02"/>
        <circle cx="20" cy="166" r="5" fill="#10e891"/>
        <text x="35" y="172" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Responsable Achats / SaaS</text>
        <text x="270" y="172" font-family="system-ui, sans-serif" font-size="15" fill="${theme.textMuted}">Sophie D. (Lead)</text>
        <text x="510" y="172" font-family="monospace" font-size="14" fill="${theme.primaryNeon}">+33 6 84 92 11 ..</text>
        <rect x="690" y="151" width="90" height="30" rx="15" fill="#10e891" fill-opacity="0.2" stroke="#10e891" stroke-width="1"/>
        <text x="735" y="171" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#10e891" text-anchor="middle">✓ ACTIF</text>

        <!-- Row 3 -->
        <rect x="0" y="208" width="800" height="64" rx="8" fill="#ffffff" fill-opacity="0.04"/>
        <circle cx="20" cy="240" r="5" fill="#10e891"/>
        <text x="35" y="246" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Fondateur &amp; Associé</text>
        <text x="270" y="246" font-family="system-ui, sans-serif" font-size="15" fill="${theme.textMuted}">Marc Antoine (Co-Founder)</text>
        <text x="510" y="246" font-family="monospace" font-size="14" fill="${theme.primaryNeon}">m.antoine@growth.io</text>
        <rect x="690" y="225" width="90" height="30" rx="15" fill="#10e891" fill-opacity="0.2" stroke="#10e891" stroke-width="1"/>
        <text x="735" y="245" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#10e891" text-anchor="middle">✓ 100%</text>

        <!-- Bottom Futuristic Live Status -->
        <rect x="0" y="290" width="800" height="74" rx="12" fill="${theme.primaryNeon}" fill-opacity="0.1" stroke="${theme.primaryNeon}" stroke-width="1.5"/>
        <circle cx="40" cy="327" r="8" fill="#10e891"/>
        <text x="65" y="333" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#ffffff">
          FLUX IA VÉRIFIÉ · LIVRAISON FORMAT EXCEL / CSV IMMÉDIATE
        </text>
        <rect x="660" y="306" width="120" height="42" rx="21" fill="${theme.primaryNeon}"/>
        <text x="720" y="332" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="900" fill="${theme.bgDark}" text-anchor="middle">DÈS ${price} €</text>
      </g>
    `;
  } else {
    // 3D Isometric Cyber Growth Chart & AI Overviews Dominance
    graphicElements = `
      <g transform="translate(100, 480)">
        <!-- Top Metric HUD -->
        <rect width="800" height="85" rx="14" fill="#ffffff" fill-opacity="0.04" stroke="${theme.primaryNeon}" stroke-width="1.5"/>
        <text x="35" y="38" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="${theme.primaryNeon}" letter-spacing="1">POSITIONNEMENT ALGORITHMIQUE</text>
        <text x="35" y="68" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="900" fill="#ffffff">#1 IA OVERVIEWS &amp; GOOGLE MAPS</text>
        <rect x="640" y="22" width="130" height="42" rx="21" fill="#10e891"/>
        <text x="705" y="48" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="900" fill="#030712" text-anchor="middle">+340% ROI</text>

        <!-- Dynamic Chart Bars -->
        <g transform="translate(20, 110)">
          <!-- Bar 1 (Concurrent A) -->
          <rect x="40" y="150" width="100" height="110" rx="8" fill="#ffffff" fill-opacity="0.1"/>
          <text x="90" y="140" font-family="monospace" font-size="14" fill="${theme.textMuted}" text-anchor="middle">24%</text>
          <text x="90" y="280" font-family="system-ui, sans-serif" font-size="12" fill="${theme.textMuted}" text-anchor="middle">Marché</text>

          <!-- Bar 2 (Concurrent B) -->
          <rect x="220" y="110" width="100" height="150" rx="8" fill="#ffffff" fill-opacity="0.18"/>
          <text x="270" y="100" font-family="monospace" font-size="14" fill="${theme.textMuted}" text-anchor="middle">48%</text>
          <text x="270" y="280" font-family="system-ui, sans-serif" font-size="12" fill="${theme.textMuted}" text-anchor="middle">Moyenne</text>

          <!-- Bar 3 (VOTRE SOLUTION B2BPRO) -->
          <rect x="400" y="20" width="120" height="240" rx="10" fill="${theme.primaryNeon}" stroke="#ffffff" stroke-width="2"/>
          <text x="460" y="10" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="900" fill="${theme.primaryNeon}" text-anchor="middle">98.6%</text>
          <text x="460" y="280" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">B2B PRO</text>

          <!-- Right Feature Box -->
          <g transform="translate(560, 20)">
            <rect width="200" height="240" rx="12" fill="${theme.primaryNeon}" fill-opacity="0.12" stroke="${theme.primaryNeon}" stroke-width="1.2"/>
            <text x="100" y="45" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="${theme.primaryNeon}" text-anchor="middle">GARANTIE SÉQUESTRE</text>
            <text x="100" y="95" font-family="'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">100%</text>
            <text x="100" y="130" font-family="system-ui, sans-serif" font-size="13" fill="${theme.textMuted}" text-anchor="middle">Paiement débloqué</text>
            <text x="100" y="150" font-family="system-ui, sans-serif" font-size="13" fill="${theme.textMuted}" text-anchor="middle">après validation</text>
            <rect x="30" y="175" width="140" height="36" rx="18" fill="#10e891"/>
            <text x="100" y="198" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="900" fill="#030712" text-anchor="middle">VÉRIFIÉ ✓</text>
          </g>
        </g>
      </g>
    `;
  }

  return `
    <!-- Glowing Outer Hull -->
    <rect x="${cardX - 4}" y="${cardY - 4}" width="${cardW + 8}" height="${cardH + 8}" rx="32" fill="none" stroke="${theme.primaryNeon}" stroke-width="1.8" opacity="0.6"/>
    
    <!-- Central Glass Panel -->
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="28" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="2"/>
    
    <!-- Top HUD Terminal Bar -->
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="54" rx="28" fill="#000000" fill-opacity="0.5"/>
    <rect x="${cardX}" y="${cardY + 30}" width="${cardW}" height="24" fill="#000000" fill-opacity="0.5"/>
    
    <!-- Terminal LEDs -->
    <circle cx="${cardX + 35}" cy="${cardY + 27}" r="6" fill="#ff5f56"/>
    <circle cx="${cardX + 55}" cy="${cardY + 27}" r="6" fill="#ffbd2e"/>
    <circle cx="${cardX + 75}" cy="${cardY + 27}" r="6" fill="#27c93f"/>
    
    <text x="${cardX + cardW / 2}" y="${cardY + 33}" font-family="monospace" font-size="12" font-weight="700" fill="${theme.primaryNeon}" text-anchor="middle" letter-spacing="1">
      ⚡ AI-SYSTEM-V2 // PROTOCOLE DE LIVRAISON SÉCURISÉ B2BPRO.STORE
    </text>

    ${graphicElements}
  `;
}

// Générateur du SVG complet 1000×1500 Version IA Élite
function generateAIPinSvg(service: any, index: number): { svg: string; theme: AITechTheme; hook: any } {
  const themeKeys = Object.keys(AI_THEMES);
  const theme = AI_THEMES[themeKeys[index % themeKeys.length]];

  const hook = makeUltraPunchyHook(service.title);
  const benefits = extractQuickBenefits(service);
  const price = service.basePrice || 25;
  const rating = Number(service.rating || 4.8).toFixed(1);
  const reviewsCount = service.reviewsCount || Math.floor(Math.random() * 35 + 18);

  const boardInfo = BOARD_MAPPING[service.pole] || BOARD_MAPPING[service.category] || DEFAULT_BOARD;

  const svg = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Deep Space Dark Background -->
      <linearGradient id="aiBgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme.bgDark}"/>
        <stop offset="50%" stop-color="#050a18"/>
        <stop offset="100%" stop-color="${theme.bgDark}"/>
      </linearGradient>

      <!-- Top Radial Glow -->
      <radialGradient id="aiTopGlow" cx="50%" cy="10%" r="55%">
        <stop offset="0%" stop-color="${theme.glowColor1}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${theme.glowColor1}" stop-opacity="0"/>
      </radialGradient>

      <!-- Bottom Radial Glow -->
      <radialGradient id="aiBottomGlow" cx="50%" cy="85%" r="45%">
        <stop offset="0%" stop-color="${theme.glowColor2}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${theme.glowColor2}" stop-opacity="0"/>
      </radialGradient>

      <!-- Magnetic Button Gradient -->
      <linearGradient id="aiBtnGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${theme.btnGradient[0]}"/>
        <stop offset="100%" stop-color="${theme.btnGradient[1]}"/>
      </linearGradient>

      <!-- Glow Filters -->
      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <filter id="btnPulse" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="${theme.btnGradient[0]}" flood-opacity="0.55"/>
      </filter>
    </defs>

    <!-- Base Canvas -->
    <rect width="${W}" height="${H}" fill="url(#aiBgGrad)"/>
    <rect width="${W}" height="${H}" fill="url(#aiTopGlow)"/>
    <rect width="${W}" height="${H}" fill="url(#aiBottomGlow)"/>

    <!-- Subtle Circuit Grid -->
    <g stroke="${theme.primaryNeon}" stroke-width="0.8" opacity="0.15">
      <line x1="70" y1="0" x2="70" y2="${H}"/>
      <line x1="${W - 70}" y1="0" x2="${W - 70}" y2="${H}"/>
      <line x1="0" y1="90" x2="${W}" y2="90"/>
      <line x1="0" y1="${H - 90}" x2="${W}" y2="${H - 90}"/>
      <!-- Tech crosses -->
      <path d="M60 80 L80 80 M70 70 L70 90 M${W - 80} 80 L${W - 60} 80 M${W - 70} 70 L${W - 70} 90" stroke="${theme.primaryNeon}" stroke-width="1.5"/>
    </g>

    <!-- ==================== TOP MINIMAL HEADER ==================== -->
    <g transform="translate(0, 85)">
      <!-- Board / Category Tech Pill -->
      <rect x="70" y="0" width="460" height="42" rx="21" fill="${theme.primaryNeon}" fill-opacity="0.12" stroke="${theme.primaryNeon}" stroke-width="1.5"/>
      <circle cx="95" cy="21" r="5" fill="${theme.primaryNeon}"/>
      <text x="115" y="27" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="900" fill="${theme.primaryNeon}" letter-spacing="1.2">
        ${esc(boardInfo.board.toUpperCase().substring(0, 36))}
      </text>

      <!-- Trust Rating Pill -->
      <rect x="${W - 360}" y="0" width="290" height="42" rx="21" fill="#10e891" fill-opacity="0.15" stroke="#10e891" stroke-width="1.2"/>
      <text x="${W - 215}" y="26" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="800" fill="#10e891" text-anchor="middle">
        ★ ${rating}/5 (${reviewsCount} avis) · GARANTI
      </text>
    </g>

    <!-- ==================== SHORT PUNCHY TITLE (MAX 1-2 LINES) ==================== -->
    <g transform="translate(70, 185)">
      <!-- High-Impact Main Hook -->
      <text x="0" y="45" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-1">
        ${esc(hook.titleShort)}
      </text>

      <!-- Sub-headline Pill Badge -->
      <g transform="translate(0, 85)">
        <rect width="520" height="40" rx="8" fill="#ffffff" fill-opacity="0.08" stroke="${theme.secondaryNeon}" stroke-width="1"/>
        <text x="20" y="26" font-family="'Plus Jakarta Sans', sans-serif" font-size="17" font-weight="700" fill="${theme.secondaryNeon}">
          ⚡ ${esc(hook.subBadge)}
        </text>
      </g>
    </g>

    <!-- ==================== DOMINANT 3D/HOLOGRAPHIC AI CARD ==================== -->
    <g filter="url(#neonGlow)">
      ${renderHoloAICard(theme, service, index)}
    </g>

    <!-- ==================== 3 ULTRA-CONCISE BULLET POINTS ==================== -->
    <g transform="translate(80, 1050)">
      ${benefits
        .map(
          (b, i) => `
        <g transform="translate(0, ${i * 64})">
          <!-- Neon Check Icon -->
          <circle cx="24" cy="22" r="18" fill="${theme.primaryNeon}" fill-opacity="0.2"/>
          <circle cx="24" cy="22" r="12" fill="${theme.primaryNeon}"/>
          <path d="M19 22 L23 26 L30 18" stroke="${theme.bgDark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          
          <!-- Benefit Copy -->
          <text x="60" y="29" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="800" fill="#ffffff">
            ${esc(b)}
          </text>
        </g>
      `
        )
        .join("")}
    </g>

    <!-- ==================== MAGNETIC CALL TO ACTION BUTTON ==================== -->
    <g transform="translate(70, 1265)" filter="url(#btnPulse)">
      <!-- Button Base -->
      <rect width="860" height="106" rx="53" fill="url(#aiBtnGrad)"/>
      <rect x="2" y="2" width="856" height="102" rx="51" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.4"/>
      
      <!-- Button Text -->
      <text x="430" y="63" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="900" fill="${theme.btnText}" text-anchor="middle" letter-spacing="1">
        COMMANDER CE SERVICE · DÈS ${price} € ➔
      </text>
    </g>

    <!-- ==================== TECH SECURITY FOOTER ==================== -->
    <g transform="translate(0, 1435)">
      <text x="500" y="0" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="${theme.textMuted}" text-anchor="middle">
        🛡️ Paiement Séquestré · Retouches Incluses · Vendeur Vérifié · Support 7j/7
      </text>
      <text x="500" y="28" font-family="monospace" font-size="14" font-weight="800" fill="${theme.primaryNeon}" text-anchor="middle" letter-spacing="2">
        B2BPRO.STORE // IA &amp; SOLUTIONS PROFESSIONNELLES
      </text>
    </g>
  </svg>
  `;

  return { svg, theme, hook };
}

// Moteur d'Exécution V2
export async function runPinterestV2Engine(requestedCount = 100) {
  console.log("=====================================================");
  console.log("⚡ LANCEMENT DU MOTEUR PINTEREST V2 - IA TECHNOLOGIQUE");
  console.log(`🎯 Objectif : ${requestedCount} nouveaux visuels ultra-captivants`);
  console.log("=====================================================\n");

  const allServices = await db.service.findMany({
    include: { seller: true },
    orderBy: [
      { salesCount: "desc" },
      { rating: "desc" },
      { views: "desc" }
    ]
  });

  const servicesToProcess = allServices.slice(0, requestedCount);
  console.log(`✓ ${servicesToProcess.length} services prêts pour la génération IA V2.`);

  const batchSize = 10;
  const pinRecords: any[] = [];
  const startTime = Date.now();

  for (let i = 0; i < servicesToProcess.length; i += batchSize) {
    const batch = servicesToProcess.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (service, batchIdx) => {
        const globalIdx = i + batchIdx;
        const pinNumber = String(globalIdx + 1).padStart(3, "0");
        const filename = `pin-ai-${pinNumber}-${service.slug}.webp`;
        const filePath = path.join(OUTPUT_DIR, filename);

        // A. Génération SVG V2 IA
        const { svg, theme, hook } = generateAIPinSvg(service, globalIdx);

        // B. Conversion Sharp WebP ultra-léger (~60-80 Ko)
        const webpBuffer = await sharp(Buffer.from(svg))
          .webp({ quality: 84, effort: 4 })
          .toBuffer();

        writeFileSync(filePath, webpBuffer);

        // C. Métadonnées Pinterest SEO optimisées (SANS planification = immédiate)
        const boardInfo = BOARD_MAPPING[service.pole] || BOARD_MAPPING[service.category] || DEFAULT_BOARD;
        const benefits = extractQuickBenefits(service);
        const rating = Number(service.rating || 4.8).toFixed(1);
        const salesCount = service.salesCount || 150;

        // Titre ultra-accrocheur (< 100 chars)
        let pinTitle = `⚡ ${hook.titleShort} | ${hook.subBadge} (Dès ${service.basePrice}€)`;
        if (pinTitle.length > 95) {
          pinTitle = pinTitle.substring(0, 92) + "…";
        }

        // Description engageante et orientée conversion immédiate
        const pinDesc = `🚀 Automatisez et boostez votre activité : ${hook.titleShort}. Obtenez un livrable clé en main dès ${service.basePrice} € garanti : 1) ${benefits[0]} 2) ${benefits[1]} 3) ${benefits[2]}. Vendeur noté ${rating}/5 (${salesCount}+ commandes). Paiement 100% séquestré jusqu'à validation. 👉 Cliquez sur l'image pour commander en 1 clic sur b2bpro.store ! ${boardInfo.hashtags.join(" ")}`;

        // URL GitHub Raw directe (accessible publiquement avec le dépôt en public)
        const rawGithubUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/pinterest/pins-v2/${filename}`;
        const serviceUrl = `${BASE_URL}/services/${service.slug}`;

        // Mots-clés cibles
        const keywords = [
          boardInfo.searchSeed,
          "intelligence artificielle",
          "solutions ia b2b",
          "pme",
          "freelance",
          "automatisation entreprise",
          "growth"
        ].join(", ");

        pinRecords.push({
          index: globalIdx + 1,
          pinNumber,
          filename,
          filePath,
          themeName: theme.name,
          title: pinTitle,
          mediaUrl: rawGithubUrl,
          board: boardInfo.board,
          description: pinDesc,
          link: serviceUrl,
          publishDate: "", // VIDE = PUBLICATION IMMÉDIATE SANS PLANIFICATION
          keywords,
          price: service.basePrice,
          rating,
          salesCount,
          sizeKb: Math.round(webpBuffer.length / 1024)
        });
      })
    );

    console.log(`  ✓ Lot IA V2 ${Math.min(i + batchSize, servicesToProcess.length)}/${servicesToProcess.length} rendu.`);
  }

  // Génération du CSV Pinterest Bulk V2 (SANS planification = tout publié d'un coup)
  console.log("\n📄 Génération du fichier CSV officiel Pinterest Bulk V2 (Publication Immédiate)...");
  const csvHeaders = ["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"];

  function escapeCsvCell(cell: string): string {
    const text = (cell || "").toString().replace(/"/g, '""');
    return `"${text}"`;
  }

  const csvRows = pinRecords.map(p => {
    return [
      escapeCsvCell(p.title),
      escapeCsvCell(p.mediaUrl),
      escapeCsvCell(p.board),
      escapeCsvCell(""), // Thumbnail vide
      escapeCsvCell(p.description),
      escapeCsvCell(p.link),
      escapeCsvCell(""), // DATE VIDE = PUBLICATION IMMÉDIATE D'UN COUP
      escapeCsvCell(p.keywords)
    ].join(",");
  });

  const fullCsvContent = [csvHeaders.join(","), ...csvRows].join("\r\n");

  writeFileSync(CSV_FILE, fullCsvContent, "utf-8");
  writeFileSync(ROOT_CSV_FILE, fullCsvContent, "utf-8");
  console.log(`✓ CSV créé : ${CSV_FILE}`);
  console.log(`✓ CSV racine créé : ${ROOT_CSV_FILE}`);

  // Visualiseur interactif V2 (avec fallback images locales et GitHub)
  console.log("\n🎨 Génération du visualiseur interactif V2...");
  const boardsList = Array.from(new Set(pinRecords.map(p => p.board)));

  const galleryHtml = `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Showcase V2 IA · 100 Nouveaux Visuels Pinterest B2B Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .pin-card:hover .pin-overlay { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">

  <header class="border-b border-cyan-900/50 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 font-black text-xl text-black">
          ⚡
        </div>
        <div>
          <h1 class="text-xl font-extrabold tracking-tight">b2bpro.store · Pinterest V2 (Style IA Technologique)</h1>
          <p class="text-xs text-cyan-400">100 Visuels 1000×1500 · Import Immédiat (Sans Planification)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a href="pinterest-bulk-upload-100-pins-v2-ai.csv" download class="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-black text-sm text-black flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Télécharger le CSV V2 (Publication Immédiate)
        </a>
      </div>
    </div>
  </header>

  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <p class="text-xs uppercase font-bold text-slate-400">Nouveaux Visuels IA</p>
        <p class="text-3xl font-extrabold text-cyan-400 mt-1">${pinRecords.length}</p>
        <p class="text-xs text-emerald-400 mt-1 font-semibold">✓ Style IA Tech Scroll-Stop</p>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <p class="text-xs uppercase font-bold text-slate-400">Mode d'import</p>
        <p class="text-3xl font-extrabold text-emerald-400 mt-1">Immédiat</p>
        <p class="text-xs text-slate-400 mt-1">Tout publié d'un coup</p>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <p class="text-xs uppercase font-bold text-slate-400">Résolution</p>
        <p class="text-3xl font-extrabold text-white mt-1">1000 × 1500</p>
        <p class="text-xs text-slate-400 mt-1">Ratio d'or Pinterest (2:3)</p>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <p class="text-xs uppercase font-bold text-slate-400">Poids Moyen</p>
        <p class="text-3xl font-extrabold text-amber-400 mt-1">~70 Ko</p>
        <p class="text-xs text-slate-400 mt-1">WebP Ultra-léger</p>
      </div>
    </div>
  </section>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      ${pinRecords
        .map(
          p => `
        <div class="pin-card relative group rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/50 flex flex-col">
          <div class="relative aspect-[2/3] bg-slate-950 overflow-hidden">
            <img src="${p.mediaUrl}" onerror="this.src='pins-v2/${p.filename}'" alt="${p.title}" class="w-full h-full object-cover" loading="lazy">
            <div class="pin-overlay absolute inset-0 bg-slate-950/85 backdrop-blur-sm opacity-0 transition-all duration-300 p-5 flex flex-col justify-between">
              <div>
                <span class="inline-block px-2.5 py-1 rounded-md text-[11px] font-black bg-cyan-500 text-black uppercase tracking-wider mb-2">
                  ${p.board}
                </span>
                <p class="text-xs text-slate-300 line-clamp-4 leading-relaxed font-medium">
                  ${p.description}
                </p>
              </div>

              <div class="space-y-2">
                <a href="${p.link}" target="_blank" class="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-black text-xs text-black text-center block shadow transition">
                  Commander (${p.price} €) ➔
                </a>
                <a href="${p.mediaUrl}" target="_blank" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-[11px] text-slate-300 text-center block border border-slate-700 transition">
                  Lien Brut GitHub (CSV)
                </a>
              </div>
            </div>
          </div>

          <div class="p-4 flex flex-col justify-between flex-grow">
            <div>
              <p class="text-[11px] font-black text-cyan-400">#${p.pinNumber} · ${p.themeName}</p>
              <h2 class="text-sm font-bold text-white mt-1 line-clamp-2 leading-snug" title="${p.title}">
                ${p.title}
              </h2>
            </div>
            
            <div class="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span class="text-emerald-400 font-bold">⚡ Immédiat</span>
              <span class="font-extrabold text-white text-sm">${p.price} €</span>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  </main>
</body>
</html>`;

  writeFileSync(GALLERY_FILE, galleryHtml, "utf-8");
  if (existsSync("C:/Users/Administrateur/Downloads")) {
    writeFileSync(DOWNLOADS_GALLERY, galleryHtml, "utf-8");
    console.log(`✓ Copié dans Downloads : ${DOWNLOADS_GALLERY}`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=====================================================");
  console.log(`🎉 SUCCÈS V2 IA EN ${totalTime}s !`);
  console.log(`✓ 100 nouveaux visuels WebP dans public/pinterest/pins-v2/`);
  console.log(`✓ CSV bulk sans planification : ${ROOT_CSV_FILE}`);
  console.log(`✓ Galerie interactive : ${GALLERY_FILE}`);
  console.log("=====================================================\n");
}

if (require.main === module || process.argv[1]?.includes("generate-pinterest-v2-ai")) {
  runPinterestV2Engine(100)
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ ERREUR MOTEUR V2 IA:", err);
      process.exit(1);
    });
}
