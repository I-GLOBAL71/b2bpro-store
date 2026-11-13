/**
 * CLI : `bun run gen:favicon` — génère les fichiers d'icônes dérivés du
 * favicon vectoriel b2bpro.store (public/favicon.svg).
 *
 *   • public/favicon.ico        — ICO multi-tailles (16/32/48, PNG embarqués,
 *                                  coins arrondis transparents) : sert les
 *                                  navigateurs legacy + l'URL /favicon.ico
 *                                  (plus de 404 dans les journaux).
 *   • public/apple-touch-icon.png — 180×180 plein cadre (Apple applique lui-même
 *                                  ses coins arrondis : jamais de transparence).
 *   • public/icons/icon-192.png / icon-512.png — icônes du site.webmanifest
 *                                  (Android « À l'écran d'accueil », onglets).
 *   • public/icons/maskable-192.png / maskable-512.png — variantes MASKABLE du
 *                                  manifeste (v2.3.0 PWA) : Android peut rogner
 *                                  les coins selon la forme de l'icône d'accueil.
 *                                  Le glyphe (51 % du cadre) tient déjà dans la
 *                                  zone sûre maskable (cercle inscrit de 80 %).
 *
 * Sources : SVG vectoriels rendus via sharp (librsvg) à haute densité puis
 * redimensionnés Lanczos — traits et dégradés exacts à toutes les tailles.
 */
import sharp from "sharp";

const ROOT = import.meta.dir.replace("/scripts", "");

/** Glyphe « b2b » — identique à public/favicon.svg (une seule source de vérité). */
const GLYPHS = `
  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"
     transform="translate(3.2 3.2) scale(0.9)">
    <path d="M10 12 V52"/>
    <path d="M10 32 a10 10 0 1 1 0 20"/>
    <path d="M27 32 a5.5 5.5 0 1 1 9.5 4 L28.5 52 H37"/>
    <path d="M44 12 V52"/>
    <path d="M44 32 a10 10 0 1 1 0 20"/>
  </g>`;

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="#34d399"/>
    </linearGradient>
  </defs>`;

/** Variante coins arrondis + transparence (favicon classique). */
const ROUNDED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${GRADIENT}
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#g)"/>${GLYPHS}
</svg>`;

/** Variante plein cadre (apple-touch / manifeste) : marges de sécurité 18 %. */
const FULLBLEED_SVG = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}" height="${size}" viewBox="0 0 64 64">${GRADIENT}
  <rect x="0" y="0" width="64" height="64" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"
     transform="translate(5.76 5.76) scale(0.82)">
    <path d="M10 12 V52"/>
    <path d="M10 32 a10 10 0 1 1 0 20"/>
    <path d="M27 32 a5.5 5.5 0 1 1 9.5 4 L28.5 52 H37"/>
    <path d="M44 12 V52"/>
    <path d="M44 32 a10 10 0 1 1 0 20"/>
  </g>
</svg>`;

/** Rendu Lanczos d'un SVG à une taille donnée. */
async function renderPng(svg: string, size: number, density = 288): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density })
    .resize(size, size, { kernel: "lanczos3" })
    .png()
    .toBuffer();
}

/** Assemble un fichier .ico (PNG embarqués — compris par tous les navigateurs). */
function assembleIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, e); // largeur
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1); // hauteur
    entries.writeUInt8(0, e + 2); // palette
    entries.writeUInt8(0, e + 3); // réservé
    entries.writeUInt16LE(1, e + 4); // plans
    entries.writeUInt16LE(32, e + 6); // profondeur
    entries.writeUInt32LE(data.byteLength, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += data.byteLength;
  });

  return Buffer.concat([header, entries, ...pngs.map(({ data }) => data)]);
}

async function main() {
  // 1) favicon.ico — 16/32/48 px, coins arrondis transparents.
  const icoPngs: { size: number; data: Buffer }[] = [];
  for (const size of [16, 32, 48]) {
    icoPngs.push({ size, data: await renderPng(ROUNDED_SVG, size) });
  }
  await Bun.write(`${ROOT}/public/favicon.ico`, assembleIco(icoPngs));
  console.log(`✓ public/favicon.ico (${icoPngs.map((p) => p.size).join("/")})`);

  // 2) apple-touch-icon.png — 180×180 plein cadre.
  await Bun.write(`${ROOT}/public/apple-touch-icon.png`, await renderPng(FULLBLEED_SVG(180), 180));
  console.log("✓ public/apple-touch-icon.png (180)");

  // 3) Icônes du manifeste — 192 et 512 px plein cadre, + variantes maskable
  //    (même rendu : le glyphe occupe 51 % du cadre, dans le cercle sûr 80 %).
  for (const size of [192, 512]) {
    await Bun.write(`${ROOT}/public/icons/icon-${size}.png`, await renderPng(FULLBLEED_SVG(size), size));
    await Bun.write(`${ROOT}/public/icons/maskable-${size}.png`, await renderPng(FULLBLEED_SVG(size), size));
    console.log(`✓ public/icons/icon-${size}.png + maskable-${size}.png`);
  }
}

main().catch((e) => {
  console.error("✗ Génération des favicons échouée :", e);
  process.exit(1);
});
