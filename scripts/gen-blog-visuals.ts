/**
 * CLI : `pnpm dlx tsx --env-file=.env scripts/gen-blog-visuals.ts`
 *
 * Générateur de visuels haute performance pour le blog b2bpro.store :
 * 1. Conçoit des visuels SVG 1200×630 modernes, élégants et percutants par thématique.
 * 2. Convertit chaque visuel en WebP ultra-léger et qualitatif via sharp (qualité 82, ~40-60 Ko).
 * 3. Enregistre en local dans public/img/blog/<slug>.webp.
 * 4. Si BLOB_READ_WRITE_TOKEN est défini : téléverse directement sur Vercel Blob (blog/<slug>.webp).
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { db } from "../src/lib/db";
import { POLE_ACCENTS } from "../src/lib/site";

const W = 1200;
const H = 630;
const OUTPUT_DIR = path.join(process.cwd(), "public", "img", "blog");

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Couleurs par défaut si le thème ou la catégorie n'a pas de correspondance directe
const DEFAULT_PALETTES: Record<string, { c1: string; c2: string; accent: string; iconType: string }> = {
  "SEO & Visibilité IA": { c1: "#6366f1", c2: "#8b5cf6", accent: "#a855f7", iconType: "ai-search" },
  "Prospection & Croissance": { c1: "#059669", c2: "#10b981", accent: "#34d399", iconType: "radar-target" },
  "Prospection & Données B2B": { c1: "#059669", c2: "#0d9488", accent: "#14b8a6", iconType: "data-grid" },
  "E-commerce": { c1: "#d97706", c2: "#f59e0b", accent: "#fbbf24", iconType: "chart-growth" },
  "E-commerce & Pricing": { c1: "#d97706", c2: "#ea580c", accent: "#f97316", iconType: "chart-growth" },
  "Immobilier": { c1: "#0d9488", c2: "#14b8a6", accent: "#2dd4bf", iconType: "geo-cadastre" },
  "Marketing & Influence": { c1: "#db2777", c2: "#ec4899", accent: "#f472b6", iconType: "pulse-social" },
  "Métiers & Carrière": { c1: "#0891b2", c2: "#06b6d4", accent: "#22d3ee", iconType: "talent-network" },
  "Recrutement & RH": { c1: "#0891b2", c2: "#0284c7", accent: "#38bdf8", iconType: "talent-network" },
  "SaaS & Tech": { c1: "#2563eb", c2: "#3b82f6", accent: "#60a5fa", iconType: "tech-stack" },
  "Hôtellerie & Tourisme": { c1: "#be123c", c2: "#e11d48", accent: "#fb7185", iconType: "yield-bars" },
  "Grandes Entreprises & Finance": { c1: "#334155", c2: "#475569", accent: "#94a3b8", iconType: "finance-shield" },
  "Formation & Santé": { c1: "#7c3aed", c2: "#9333ea", accent: "#c084fc", iconType: "cert-shield" },
  "Logistique & Franchises": { c1: "#b45309", c2: "#d97706", accent: "#f59e0b", iconType: "hub-network" },
  "Grand Public & Quotidien": { c1: "#ea580c", c2: "#f97316", accent: "#fb923c", iconType: "auto-diagnostic" },
  "Sujets Stratégiques Transverses": { c1: "#4f46e5", c2: "#6366f1", accent: "#818cf8", iconType: "global-trust" },
};

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxCharsPerLine = 32, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxCharsPerLine) {
      cur = (cur + " " + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
  }
  // Si le titre a été tronqué au dernier mot
  if (lines.length === maxLines && words.length > lines.join(" ").split(/\s+/).length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[,\s]+$/, "") + "…";
  }
  return lines;
}

function renderVisualGraphic(iconType: string, accent: string): string {
  switch (iconType) {
    case "ai-search":
      return `
        <!-- Neural rings & search node -->
        <g transform="translate(850, 315)">
          <circle cx="0" cy="0" r="190" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.35"/>
          <circle cx="0" cy="0" r="140" fill="none" stroke="${accent}" stroke-width="2" opacity="0.5"/>
          <circle cx="0" cy="0" r="90" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="45" fill="${accent}" fill-opacity="0.25"/>
          <!-- Orbiting nodes -->
          <circle cx="-130" cy="-60" r="9" fill="${accent}"/>
          <circle cx="120" cy="80" r="7" fill="#ffffff" opacity="0.9"/>
          <circle cx="-70" cy="120" r="6" fill="${accent}" opacity="0.8"/>
          <circle cx="90" cy="-110" r="8" fill="#ffffff"/>
          <!-- Connecting vectors -->
          <path d="M-130 -60 L0 0 M120 80 L0 0 M-70 120 L0 0 M90 -110 L0 0" stroke="${accent}" stroke-width="1.5" opacity="0.4"/>
          <!-- Center AI query icon -->
          <path d="M-16 -16 L-4 -4 M16 -16 L4 -4 M-16 16 L-4 4 M16 16 L4 4" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="16" fill="none" stroke="#ffffff" stroke-width="3"/>
          <!-- Mini metric badge -->
          <g transform="translate(-140, 140)">
            <rect width="180" height="38" rx="8" fill="#0b0f19" fill-opacity="0.9" stroke="${accent}" stroke-width="1.2"/>
            <text x="90" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">GEO / AIO CITATIONS : #1</text>
          </g>
        </g>
      `;
    case "radar-target":
    case "data-grid":
      return `
        <!-- Target Radar & data nodes -->
        <g transform="translate(850, 315)">
          <circle cx="0" cy="0" r="180" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.3"/>
          <circle cx="0" cy="0" r="130" fill="none" stroke="${accent}" stroke-width="1.8" stroke-dasharray="8 6" opacity="0.5"/>
          <circle cx="0" cy="0" r="75" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="2.2"/>
          <line x1="-190" y1="0" x2="190" y2="0" stroke="${accent}" stroke-width="1" opacity="0.3"/>
          <line x1="0" y1="-190" x2="0" y2="190" stroke="${accent}" stroke-width="1" opacity="0.3"/>
          <!-- Target blips -->
          <circle cx="65" cy="-55" r="8" fill="#10b981"/>
          <circle cx="65" cy="-55" r="16" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
          <circle cx="-80" cy="40" r="6" fill="#ffffff"/>
          <circle cx="110" cy="70" r="7" fill="${accent}"/>
          <!-- Pulse wedge -->
          <path d="M0 0 L150 -100 A180 180 0 0 1 180 0 Z" fill="${accent}" fill-opacity="0.12"/>
          <!-- Card metric -->
          <g transform="translate(-130, 140)">
            <rect width="170" height="38" rx="8" fill="#0b0f19" fill-opacity="0.9" stroke="${accent}" stroke-width="1.2"/>
            <text x="85" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DÉLIVRABILITÉ 99,8 %</text>
          </g>
        </g>
      `;
    case "chart-growth":
      return `
        <!-- Dynamic growth curve & pricing bar -->
        <g transform="translate(850, 315)">
          <rect x="-180" y="-140" width="280" height="230" rx="16" fill="#0b0f19" fill-opacity="0.85" stroke="${accent}" stroke-width="1.5"/>
          <!-- Grid lines -->
          <line x1="-150" y1="-90" x2="70" y2="-90" stroke="#ffffff" stroke-width="0.8" opacity="0.15"/>
          <line x1="-150" y1="-30" x2="70" y2="-30" stroke="#ffffff" stroke-width="0.8" opacity="0.15"/>
          <line x1="-150" y1="30" x2="70" y2="30" stroke="#ffffff" stroke-width="0.8" opacity="0.15"/>
          <!-- Bar charts -->
          <rect x="-135" y="-10" width="22" height="70" rx="4" fill="${accent}" fill-opacity="0.4"/>
          <rect x="-95" y="-50" width="22" height="110" rx="4" fill="${accent}" fill-opacity="0.6"/>
          <rect x="-55" y="-85" width="22" height="145" rx="4" fill="${accent}" fill-opacity="0.8"/>
          <rect x="-15" y="-115" width="22" height="175" rx="4" fill="${accent}"/>
          <rect x="25" y="-130" width="22" height="190" rx="4" fill="#ffffff"/>
          <!-- Arrow growth line -->
          <path d="M-140 10 Q -60 -80 35 -145" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <polygon points="35,-145 22,-140 29,-128" fill="#ffffff"/>
          <!-- Floating badge -->
          <g transform="translate(-100, 130)">
            <rect width="180" height="38" rx="8" fill="#0b0f19" stroke="${accent}" stroke-width="1.2"/>
            <text x="90" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">MARGE CONCURRENTE : +32%</text>
          </g>
        </g>
      `;
    case "finance-shield":
    case "cert-shield":
      return `
        <!-- Shield of financial health & stability -->
        <g transform="translate(850, 315)">
          <path d="M0 -150 L110 -90 L110 30 C110 105 0 160 0 160 C0 160 -110 105 -110 30 L-110 -90 Z" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-width="2.5"/>
          <path d="M0 -120 L80 -70 L80 20 C80 80 0 125 0 125 C0 125 -80 80 -80 20 L-80 -70 Z" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="6 4" opacity="0.6"/>
          <!-- Core checkmark or key -->
          <circle cx="0" cy="5" r="42" fill="${accent}" fill-opacity="0.25"/>
          <path d="M-18 5 L-5 18 L22 -12" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Score badge -->
          <g transform="translate(-120, 140)">
            <rect width="190" height="38" rx="8" fill="#0b0f19" stroke="${accent}" stroke-width="1.2"/>
            <text x="95" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">SCORE ALTMAN Z' : &gt; 2.90</text>
          </g>
        </g>
      `;
    default:
      return `
        <!-- Tech network / abstract polygons -->
        <g transform="translate(850, 315)">
          <polygon points="0,-160 140,-70 140,80 0,160 -140,80 -140,-70" fill="none" stroke="${accent}" stroke-width="2" opacity="0.4"/>
          <polygon points="0,-110 95,-50 95,50 0,110 -95,50 -95,-50" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="2.2"/>
          <circle cx="0" cy="0" r="50" fill="${accent}" fill-opacity="0.25" stroke="#ffffff" stroke-width="2"/>
          <!-- Corner dots -->
          <circle cx="0" cy="-160" r="7" fill="#ffffff"/>
          <circle cx="140" cy="-70" r="7" fill="${accent}"/>
          <circle cx="140" cy="80" r="7" fill="#ffffff"/>
          <circle cx="0" cy="160" r="7" fill="${accent}"/>
          <circle cx="-140" cy="80" r="7" fill="#ffffff"/>
          <circle cx="-140" cy="-70" r="7" fill="${accent}"/>
          <!-- Inner icon -->
          <path d="M-14 0 L14 0 M0 -14 L0 14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          <!-- Metric badge -->
          <g transform="translate(-110, 140)">
            <rect width="180" height="38" rx="8" fill="#0b0f19" stroke="${accent}" stroke-width="1.2"/>
            <text x="90" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">EXPERTISE B2B VÉRIFIÉE</text>
          </g>
        </g>
      `;
  }
}

function buildSvg(post: {
  slug: string;
  title: string;
  category: string;
  readMinutes: number;
  coverTheme: string;
}): string {
  const palette = DEFAULT_PALETTES[post.category] || {
    c1: "#1e293b",
    c2: "#3b82f6",
    accent: "#60a5fa",
    iconType: "default",
  };

  const titleLines = wrapLines(post.title, 30, 3);
  const titleY = titleLines.length === 1 ? 280 : titleLines.length === 2 ? 250 : 220;
  const lineHeight = 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Background deep dark gradient -->
    <linearGradient id="bgCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c16"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#090d18"/>
    </linearGradient>

    <!-- Glowing accent radial halo -->
    <radialGradient id="haloGlow" cx="75%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${palette.c1}" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="${palette.c2}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#080c16" stop-opacity="0"/>
    </radialGradient>

    <!-- Top-left subtle ambient light -->
    <radialGradient id="topLeftLight" cx="15%" cy="15%" r="45%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#080c16" stop-opacity="0"/>
    </radialGradient>

    <!-- Glass card gradient -->
    <linearGradient id="glassFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>

    <!-- Border glow -->
    <linearGradient id="borderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.7"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="80%" stop-color="${palette.c1}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Pattern grid -->
    <pattern id="techGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.03"/>
      <circle cx="48" cy="48" r="1.2" fill="#ffffff" fill-opacity="0.08"/>
    </pattern>
  </defs>

  <!-- 1. Background Layers -->
  <rect width="${W}" height="${H}" fill="url(#bgCanvas)"/>
  <rect width="${W}" height="${H}" fill="url(#techGrid)"/>
  <rect width="${W}" height="${H}" fill="url(#haloGlow)"/>
  <rect width="${W}" height="${H}" fill="url(#topLeftLight)"/>

  <!-- 2. Outer Framed Border (Linear style) -->
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="20" fill="none" stroke="url(#borderGlow)" stroke-width="1.5"/>

  <!-- 3. Top Header Bar -->
  <g transform="translate(64, 76)">
    <!-- Category Pill -->
    <rect width="auto" height="34" rx="17" fill="url(#glassFill)" stroke="${palette.accent}" stroke-width="1.2"/>
    <rect x="0" y="0" width="${esc(post.category).length * 9.5 + 46}" height="34" rx="17" fill="#0b1120" fill-opacity="0.8" stroke="${palette.accent}" stroke-width="1.2"/>
    <circle cx="18" cy="17" r="4.5" fill="${palette.accent}"/>
    <text x="32" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#ffffff" letter-spacing="0.06em">
      ${esc(post.category.toUpperCase())}
    </text>

    <!-- Brand mark -->
    <g transform="translate(${W - 320}, 4)">
      <circle cx="10" cy="12" r="6" fill="${palette.accent}" fill-opacity="0.8"/>
      <text x="24" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" letter-spacing="-0.02em">
        b2bpro<tspan fill="${palette.accent}">.store</tspan>
      </text>
      <text x="125" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748b" letter-spacing="0.04em">
        · GUIDE EXPERT
      </text>
    </g>
  </g>

  <!-- 4. Left Content Area (Title & Metadata) -->
  <g transform="translate(64, ${titleY})">
    ${titleLines
      .map(
        (line, idx) => `
      <text x="0" y="${idx * lineHeight}" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.025em">
        ${esc(line)}
      </text>`
      )
      .join("")}

    <!-- Value Badge Subtitle -->
    <g transform="translate(0, ${titleLines.length * lineHeight + 22})">
      <rect width="420" height="32" rx="8" fill="#1e293b" fill-opacity="0.6" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
      <text x="16" y="20.5" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="${palette.accent}" letter-spacing="0.04em">
        MÉTHODOLOGIE D'ÉLITE · DONNÉES CHIFFRÉES · 2026
      </text>
    </g>
  </g>

  <!-- 5. Right Visual Art (Domain specific geometry) -->
  ${renderVisualGraphic(palette.iconType, palette.accent)}

  <!-- 6. Bottom Meta Footer -->
  <g transform="translate(64, ${H - 68})">
    <!-- Reading Time Badge -->
    <rect width="160" height="30" rx="8" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
    <circle cx="16" cy="15" r="5" fill="none" stroke="${palette.accent}" stroke-width="1.8"/>
    <polyline points="16,12 16,15 18,17" fill="none" stroke="${palette.accent}" stroke-width="1.5"/>
    <text x="30" y="19" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">
      ${post.readMinutes} min de lecture
    </text>

    <!-- Trust Seal -->
    <g transform="translate(180, 0)">
      <rect width="180" height="30" rx="8" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
      <path d="M14 15 L18 19 L26 11" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
      <text x="34" y="19" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">
        Conforme SGA™ 2026
      </text>
    </g>

    <!-- Security reassurance -->
    <g transform="translate(380, 0)">
      <rect width="210" height="30" rx="8" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
      <text x="16" y="19" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#64748b">
        Tiers de confiance Séquestre
      </text>
    </g>
  </g>
</svg>`;
}

async function main() {
  console.log("═════════════════════════════════════════════════════════");
  console.log("  GÉNÉRATEUR DE VISUELS WEBP BLOG — b2bpro.store");
  console.log("  1200×630 · Qualité 82 · Vercel Blob Ready");
  console.log("═════════════════════════════════════════════════════════");

  const posts = await db.blogPost.findMany({
    select: { slug: true, title: true, category: true, readMinutes: true, coverTheme: true },
    orderBy: { publishedAt: "asc" },
  });

  console.log(`→ Traitement de ${posts.length} articles de blog…\n`);

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (hasBlobToken) {
    console.log("✓ BLOB_READ_WRITE_TOKEN détecté : upload direct activé vers Vercel Blob.");
  } else {
    console.log("ℹ BLOB_READ_WRITE_TOKEN non défini : génération locale dans public/img/blog/ (prêt pour synchronisation).");
  }

  const manifest: Record<string, { slug: string; localPath: string; blobUrl?: string; bytes: number }> = {};
  let totalBytes = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const svg = buildSvg(post);

    // Rasterisation SVG -> WebP 1200×630 haute fidélité
    const webpBuffer = await sharp(Buffer.from(svg), { density: 144 })
      .resize({ width: W, height: H, fit: "cover" })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const localFileName = `${post.slug}.webp`;
    const localFilePath = path.join(OUTPUT_DIR, localFileName);
    writeFileSync(localFilePath, webpBuffer);

    totalBytes += webpBuffer.length;
    const kb = (webpBuffer.length / 1024).toFixed(1);

    let blobUrl: string | undefined = undefined;
    if (hasBlobToken) {
      try {
        const res = await put(`blog/${localFileName}`, webpBuffer, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        blobUrl = res.url;
      } catch (err) {
        console.warn(`  ⚠ Échec upload Blob pour ${post.slug}:`, (err as Error).message);
      }
    }

    manifest[post.slug] = {
      slug: post.slug,
      localPath: `/img/blog/${localFileName}`,
      blobUrl,
      bytes: webpBuffer.length,
    };

    console.log(
      `[${i + 1}/${posts.length}] ✓ ${post.slug} → ${kb} Ko ${blobUrl ? `(Blob: ${blobUrl})` : `(local)`}`
    );
  }

  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`✓ ${posts.length} visuels WebP générés avec succès.`);
  console.log(`  Poids total : ${(totalBytes / 1024).toFixed(1)} Ko (moyenne : ${(totalBytes / posts.length / 1024).toFixed(1)} Ko / visuel).`);
  console.log(`  Dossier : public/img/blog/`);
  console.log(`  Manifest : public/img/blog/manifest.json`);
  console.log("═════════════════════════════════════════════════════════");

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
