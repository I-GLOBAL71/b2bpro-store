/**
 * CLI : `bun run thumbs:blob` — migration des miniatures vers Vercel Blob (WebP)
 *
 * Stack de production (mandat utilisateur) : les 3 miniatures de chaque service
 * (et optionnellement les avatars vendeurs) sont converties en WebP compressé
 * puis hébergées sur Vercel Blob ; les URLs sont persistées dans
 * Service.thumbUrls / Seller.avatarUrl (fallback automatique sur les SVG
 * locaux si le champ est absent — jamais d'image cassée).
 *
 * Usage :
 *   bun run thumbs:blob                    # migration complète (336 miniatures)
 *   bun run thumbs:blob --with-avatars     # + 33 avatars vendeurs
 *   bun run thumbs:blob --dry-run          # conversion locale sans upload (validation)
 *   bun run thumbs:blob --service=slug     # un seul service (test/reprise)
 *
 * Prérequis : BLOB_READ_WRITE_TOKEN (Vercel → Storage → .env.local) sauf en
 * --dry-run. Idempotent : addRandomSuffix=false → URLs stables, ré-exécutable.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { db } from "../src/lib/db";
import { parseThumbUrls } from "../src/lib/contracts";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const WITH_AVATARS = args.includes("--with-avatars");
const SERVICE_FILTER = args.find((a) => a.startsWith("--service="))?.split("=")[1];
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || undefined;

const THUMB_WIDTH = 1200; // rasterisation à la taille native des SVG (1200×750)
const AVATAR_SIZE = 256;
const WEBP_QUALITY = 82;

interface FileStat {
  ref: string;
  svgBytes: number;
  webpBytes: number;
}

function pct(a: number, b: number): string {
  if (a === 0) return "—";
  return `${Math.round((1 - b / a) * 100)} %`;
}

async function convertToWebp(svgPath: string, width: number): Promise<Buffer> {
  const input = await fs.readFile(svgPath);
  return sharp(input, { density: 96 })
    .resize({ width, withoutEnlargement: false })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

async function uploadOrDryRun(
  webp: Buffer,
  blobPath: string,
  dryDir: string | null
): Promise<string> {
  if (dryDir) {
    const local = path.join(dryDir, blobPath);
    await fs.mkdir(path.dirname(local), { recursive: true });
    await fs.writeFile(local, webp);
    return `file://${local}`;
  }
  const { url } = await put(blobPath, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false, // URLs stables → script idempotent
  });
  return url;
}

// ─── Miniatures des services ─────────────────────────────────────────────────
const services = await db.service.findMany({
  select: { id: true, slug: true, thumbUrls: true },
  orderBy: { slug: "asc" },
  ...(SERVICE_FILTER ? { where: { slug: SERVICE_FILTER } } : {}),
  ...(LIMIT && !SERVICE_FILTER ? { take: LIMIT } : {}),
});

if (services.length === 0) {
  console.error("Aucun service à traiter" + (SERVICE_FILTER ? ` (slug : ${SERVICE_FILTER})` : "") + ".");
  process.exit(1);
}

const thumbsDir = DRY_RUN ? path.resolve("public/thumbs-webp") : null;
const stats: FileStat[] = [];
let migrated = 0;
let skipped = 0;

console.log(`\n🖱  Migration miniatures → Vercel Blob (WebP q${WEBP_QUALITY}, ${THUMB_WIDTH}px)`);
console.log(DRY_RUN ? "   MODE DRY-RUN : conversion locale, aucun upload, base inchangée.\n" : "");

for (const svc of services) {
  const existing = parseThumbUrls(svc.thumbUrls);
  if (existing && !DRY_RUN) {
    skipped++;
    continue; // déjà migrée (idempotence)
  }
  const urls: string[] = [];
  for (let v = 1; v <= 3; v++) {
    const svgPath = path.resolve(`public/thumbs/${svc.slug}-${v}.svg`);
    let svgBytes = 0;
    try {
      svgBytes = (await fs.stat(svgPath)).size;
    } catch {
      console.error(`   ✗ ${svc.slug}-${v}.svg introuvable — service ignoré.`);
      urls.length = 0;
      break;
    }
    const webp = await convertToWebp(svgPath, THUMB_WIDTH);
    const url = await uploadOrDryRun(webp, `thumbs/${svc.slug}-${v}.webp`, thumbsDir);
    stats.push({ ref: `${svc.slug}-${v}`, svgBytes, webpBytes: webp.length });
    urls.push(url);
  }
  if (urls.length === 3) {
    if (!DRY_RUN) {
      await db.service.update({
        where: { id: svc.id },
        data: { thumbUrls: JSON.stringify(urls) },
      });
    }
    migrated++;
    process.stdout.write(`   ✓ ${svc.slug} (${migrated}/${services.length - skipped})\n`);
  }
}

// ─── Avatars vendeurs (optionnel) ─────────────────────────────────────────────
let avatarsMigrated = 0;
if (WITH_AVATARS) {
  const avatarsDir = DRY_RUN ? path.resolve("public/avatars-webp") : null;
  const sellers = await db.seller.findMany({
    select: { id: true, slug: true, avatarUrl: true },
    orderBy: { slug: "asc" },
  });
  console.log(`\n👤 Avatars vendeurs (${sellers.length})`);
  for (const seller of sellers) {
    if (seller.avatarUrl && !DRY_RUN) continue; // idempotence
    const svgPath = path.resolve(`public/avatars/${seller.slug}.svg`);
    try {
      await fs.access(svgPath);
    } catch {
      console.error(`   ✗ ${seller.slug}.svg introuvable — ignoré.`);
      continue;
    }
    const svgBytes = (await fs.stat(svgPath)).size;
    const webp = await convertToWebp(svgPath, AVATAR_SIZE);
    const url = await uploadOrDryRun(webp, `avatars/${seller.slug}.webp`, avatarsDir);
    stats.push({ ref: `avatar/${seller.slug}`, svgBytes, webpBytes: webp.length });
    if (!DRY_RUN) {
      await db.seller.update({ where: { id: seller.id }, data: { avatarUrl: url } });
    }
    avatarsMigrated++;
    process.stdout.write(`   ✓ ${seller.slug}\n`);
  }
}

// ─── Rapport ──────────────────────────────────────────────────────────────────
const totalSvg = stats.reduce((s, f) => s + f.svgBytes, 0);
const totalWebp = stats.reduce((s, f) => s + f.webpBytes, 0);
console.log(`\n═══ Rapport de migration ═══`);
console.log(`   Fichiers convertis     : ${stats.length}`);
console.log(`   Services migrés        : ${migrated}${skipped ? ` (+${skipped} déjà migrés, ignorés)` : ""}`);
if (WITH_AVATARS) console.log(`   Avatars migrés         : ${avatarsMigrated}`);
if (stats.length > 0) {
  console.log(`   Volume SVG cumulé      : ${(totalSvg / 1024).toFixed(1)} Ko`);
  console.log(`   Volume WebP cumulé     : ${(totalWebp / 1024).toFixed(1)} Ko (moy. ${(totalWebp / stats.length / 1024).toFixed(1)} Ko/fichier)`);
  if (totalWebp < totalSvg) {
    console.log(`   Gain de compression    : ${pct(totalSvg, totalWebp)}`);
  } else {
    console.log(`   Note                   : les SVG vectoriels sources sont minuscules ; le WebP`);
    console.log(`     rastérisé reste très léger et apporte la compatibilité universelle`);
    console.log(`     (OG/réseaux sociaux, optimiseur next/image, CDN Blob).`);
  }
}
if (DRY_RUN) {
  console.log(`   Sortie locale          : public/thumbs-webp/${WITH_AVATARS ? " + public/avatars-webp/" : ""}`);
  console.log(`   → Relancer sans --dry-run (et BLOB_READ_WRITE_TOKEN) pour l'upload réel.`);
} else {
  console.log(`   Base mise à jour       : Service.thumbUrls${WITH_AVATARS ? " + Seller.avatarUrl" : ""}`);
  console.log(`   → Vérification : bun run guard`);
}
process.exit(0);
