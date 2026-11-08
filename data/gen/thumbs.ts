/** Générateur de miniatures SVG — 3 variantes modernes et épurées par service.
 * Variantes : « Éclat » (gradient pôle), « Données » (dark + graphique), « Épuré » (light minimal). */

import { writeFileSync, mkdirSync } from "fs";
import type { PoleDef } from "./poles";

// Icônes Lucide simplifiées (path 24×24, stroke)
const ICON_PATHS: Record<string, string> = {
  target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>`,
  "shopping-cart": `<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 3h2l2.6 12.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.3L20.5 7H6"/><path d="M9.5 10.5h4"/>`,
  bot: `<rect x="4" y="8" width="16" height="11" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/><path d="M12 8V5M10.5 5h3"/><path d="M9 16.2c1.8 1 4.2 1 6 0"/>`,
  "building-2": `<path d="M3 21h18"/><path d="M4 21V7l7-4v18"/><path d="M11 21V11l9 3v7"/><path d="M7 9h.01M7 13h.01M7 17h.01M15 16h.01M15 18h.01"/>`,
  megaphone: `<path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8a4.5 4.5 0 0 1 0 8"/><path d="M17.5 5.5a8 8 0 0 1 0 13"/>`,
  users: `<circle cx="9" cy="8" r="3.4"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M14.8 14.6A4.6 4.6 0 0 1 21 19.5"/>`,
  "calendar-days": `<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>`,
  "heart-handshake": `<path d="M12 21C7 16.5 3 13 3 9a4.6 4.6 0 0 1 9-1.2A4.6 4.6 0 0 1 21 9c0 .7-.15 1.35-.42 1.96"/><path d="M12 14.5l-2-2a1.8 1.8 0 1 0-2.5 2.5L12 19l4.5-4"/><path d="m18 12 3 3-3 3"/>`,
  "utensils-crossed": `<path d="M4 3v7a2.5 2.5 0 0 0 5 0V3"/><path d="M4 3v18"/><path d="M9 12v9"/><path d="M20 3l-5.5 8.5L20 20"/><path d="M13.5 11.5 8.5 3"/>`,
  briefcase: `<rect x="3" y="7.5" width="18" height="13" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/><path d="M12 11.5v2"/>`,
  cpu: `<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 2.5v3.5M15 2.5v3.5M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>`,
  "trending-up": `<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h6v6"/>`,
  "graduation-cap": `<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.8v4.4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4.4"/><path d="M21.5 9.5v5"/>`,
  truck: `<path d="M3 6.5h11v9H3z"/><path d="M14 9.5h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M9 17.5h6.5"/>`,
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Découpe un titre en lignes ≤ maxChars. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) cur = (cur + " " + w).trim();
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1 && cur.length > maxChars) break;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
}

function iconSvg(pole: PoleDef, x: number, y: number, size: number, color: string, strokeWidth = 1.8): string {
  const body = ICON_PATHS[pole.icon] || ICON_PATHS.target;
  return `<g transform="translate(${x} ${y}) scale(${size / 24})"><g fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</g></g>`;
}

export interface ThumbService {
  slug: string;
  title: string; // titre épuré (sans "Je vais")
  category: string;
  basePrice: number;
  deliveryDays: number;
  pole: PoleDef;
}

const W = 1200;
const H = 750;

export function thumbV1(s: ThumbService): string {
  const [c1, c2] = s.pole.hue;
  const titleLines = wrap(s.title, 34, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1060" cy="90" r="260" fill="url(#glow)"/>
  <circle cx="80" cy="700" r="200" fill="#ffffff" opacity="0.06"/>
  <g opacity="0.14" fill="#ffffff">
    ${Array.from({ length: 6 }, (_, i) => `<circle cx="${150 + i * 30}" cy="${120 + i * 96}" r="3.5"/>`).join("")}
  </g>
  <path d="M0 610 Q 300 560 600 610 T 1200 600 V 750 H0 Z" fill="#ffffff" opacity="0.07"/>
  <g transform="translate(80 90)">
    <rect width="96" height="96" rx="26" fill="#ffffff" opacity="0.16"/>
    ${iconSvg(s.pole, 14, 14, 68, "#ffffff", 2)}
  </g>
  <text x="200" y="150" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="26" font-weight="600" fill="#ffffff" opacity="0.92" letter-spacing="1.5">${esc(s.category.toUpperCase())}</text>
  ${titleLines
    .map(
      (l, i) =>
        `<text x="80" y="${290 + i * 74}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="60" font-weight="800" fill="#ffffff">${esc(l)}</text>`
    )
    .join("\n  ")}
  <g transform="translate(80 ${300 + titleLines.length * 74})">
    <rect width="270" height="64" rx="32" fill="#ffffff"/>
    <text x="135" y="41" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="28" font-weight="700" fill="${c1}">dès ${s.basePrice} € · ${s.deliveryDays} j</text>
  </g>
  <g transform="translate(${W - 260} ${H - 78})">
    <rect width="180" height="48" rx="24" fill="#0f172a" opacity="0.35"/>
    <text x="90" y="31" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#ffffff">b2bpro.store</text>
  </g>
</svg>`;
}

export function thumbV2(s: ThumbService): string {
  const [c1, c2] = s.pole.hue;
  const accent = c2;
  const titleLines = wrap(s.title, 30, 3);
  // mini bar chart décoratif
  const bars = [46, 88, 62, 120, 96, 150, 128, 190];
  const barX = W - 420;
  const barY = H - 150;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="acc" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.35"/><stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.14"/><stop offset="60%" stop-color="#0f172a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0c1222"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <g opacity="0.35">
    ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<circle cx="${70 + c * 36}" cy="${70 + r * 36}" r="2" fill="#334155"/>`).join("")).join("")}
  </g>
  <g transform="translate(80 92)">
    <rect width="88" height="88" rx="24" fill="none" stroke="${accent}" stroke-width="2.5"/>
    ${iconSvg(s.pole, 13, 13, 62, accent, 2)}
  </g>
  <text x="196" y="150" font-family="ui-monospace, 'SF Mono', monospace" font-size="24" font-weight="600" fill="${accent}" letter-spacing="2">${esc(s.category.toUpperCase())}</text>
  ${titleLines
    .map(
      (l, i) =>
        `<text x="80" y="${288 + i * 76}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="62" font-weight="800" fill="#f8fafc">${esc(l)}</text>`
    )
    .join("\n  ")}
  <rect x="80" y="${312 + titleLines.length * 76}" width="120" height="7" rx="3.5" fill="${accent}"/>
  <text x="80" y="${415 + titleLines.length * 76}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="30" font-weight="600" fill="#94a3b8">Livraison ${s.deliveryDays} jours ouvrés · Expert vérifié</text>
  <g>
    ${bars
      .map((h, i) => `<rect x="${barX + i * 44}" y="${barY - h}" width="26" height="${h}" rx="7" fill="url(#acc)"/>`)
      .join("")}
    <path d="M${barX - 10} ${barY + 10} H ${barX + 380}" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g transform="translate(${W - 300} 96)">
    <rect width="220" height="56" rx="28" fill="${accent}" opacity="0.15"/>
    <text x="110" y="36" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="26" font-weight="700" fill="${accent}">dès ${s.basePrice} €</text>
  </g>
  <g transform="translate(${W - 260} ${H - 78})">
    <text x="90" y="31" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#64748b">b2bpro.store</text>
  </g>
</svg>`;
}

export function thumbV3(s: ThumbService): string {
  const [c1, c2] = s.pole.hue;
  const titleLines = wrap(s.title, 32, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="blob" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.16"/><stop offset="100%" stop-color="${c2}" stop-opacity="0.10"/>
    </linearGradient>
    <linearGradient id="chip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#fafaf9"/>
  <path d="M780 -60 C 950 80, 1120 220, 1250 420 L 1250 -60 Z" fill="url(#blob)"/>
  <circle cx="1080" cy="620" r="210" fill="url(#blob)"/>
  <circle cx="1060" cy="600" r="210" fill="none" stroke="${c1}" stroke-opacity="0.15" stroke-width="2"/>
  <g transform="translate(84 96)">
    <rect width="92" height="92" rx="26" fill="url(#chip)"/>
    ${iconSvg(s.pole, 14, 14, 64, "#ffffff", 2)}
  </g>
  <text x="200" y="158" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="25" font-weight="600" fill="${c1}" letter-spacing="1.6">${esc(s.category.toUpperCase())}</text>
  ${titleLines
    .map(
      (l, i) =>
        `<text x="84" y="${300 + i * 74}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="60" font-weight="800" fill="#1c1917">${esc(l)}</text>`
    )
    .join("\n  ")}
  <rect x="84" y="${322 + titleLines.length * 74}" width="140" height="8" rx="4" fill="url(#chip)"/>
  <g transform="translate(84 ${H - 150})">
    <circle cx="20" cy="20" r="20" fill="${c1}" opacity="0.12"/>
    <path d="M12 20.5l4.5 4.5L28 14" fill="none" stroke="${c1}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="56" y="29" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="27" font-weight="600" fill="#57534e">Livrable vérifié en ${s.deliveryDays} jours</text>
  </g>
  <g transform="translate(${W - 320} ${H - 150})">
    <rect width="236" height="58" rx="29" fill="#1c1917"/>
    <text x="118" y="38" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="27" font-weight="700" fill="#fafaf9">dès ${s.basePrice} €</text>
  </g>
  <g transform="translate(${W - 250} 60)">
    <text x="85" y="30" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="23" font-weight="800" fill="#a8a29e">b2bpro.store</text>
  </g>
</svg>`;
}

export function generateThumb(s: ThumbService, dir: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${s.slug}-1.svg`, thumbV1(s), "utf-8");
  writeFileSync(`${dir}/${s.slug}-2.svg`, thumbV2(s), "utf-8");
  writeFileSync(`${dir}/${s.slug}-3.svg`, thumbV3(s), "utf-8");
}

/** Avatar SVG aux initiales. */
export function generateAvatar(
  name: string,
  colors: [string, string],
  path: string
) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${colors[0]}"/><stop offset="100%" stop-color="${colors[1]}"/></linearGradient></defs>
  <rect width="256" height="256" rx="128" fill="url(#g)"/>
  <text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="104" font-weight="700" fill="#ffffff">${esc(initials)}</text>
</svg>`;
  writeFileSync(path, svg, "utf-8");
}
