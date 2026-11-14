/**
 * Génère docs/GSC-SOUMISSION-QUOTIDIENNE.txt — la liste journalière des URLs à
 * soumettre à Google Search Console pour indexation rapide : l'intégralité des
 * 176 URLs indexables du site, découpée en lots de 10 URLs par jour (quota GSC
 * d'« Inspection d'URL → Demander l'indexation » : environ 10 demandes/jour et
 * par propriété), plus la routine fixe post-rotation et les nouveautés.
 *
 * Ordre de priorité de la rotation (cohérent avec sitemap.xml — mêmes URLs) :
 *   1. pages clés (accueil, catalogue, blog, support)
 *   2. les 14 pages catégories (les plus fournies d'abord)
 *   3. les fiches service (best-sellers d'abord — ventes décroissantes)
 *   4. les profils vendeurs (« top » et mieux notés d'abord)
 *   5. les articles de blog (les plus récents d'abord)
 *
 * Usage : bun run scripts/gen-gsc-daily.ts   (alias : bun run gen:gsc-daily)
 */
import { Database } from "bun:sqlite";

const BASE = "https://b2bpro.store";
const LOT = 10; // quota GSC recommandé par jour et par propriété
const RULE = "=".repeat(80);

const POLE_LABELS: Record<string, string> = {
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

interface ServiceRow {
  slug: string;
  poleSlug: string;
  salesCount: number;
  rating: number;
  createdAt: number | string;
}

interface SellerRow {
  slug: string;
  isTop: number;
  rating: number;
  reviewsCount: number;
}

interface PostRow {
  slug: string;
  publishedAt: number | string;
}

/** YYYY-MM-DD depuis un champ DateTime SQLite (epoch ms ou chaîne). */
function isoDay(v: number | string): string {
  const ms = typeof v === "number" ? v : /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "date inconnue";
}

const db = new Database("db/custom.db", { readonly: true });

const services = db
  .query(
    "SELECT slug, poleSlug, salesCount, rating, createdAt FROM Service ORDER BY salesCount DESC, rating DESC, slug ASC",
  )
  .all() as ServiceRow[];

// Catégories : les pôles les plus fournis d'abord (même logique que gen-gsc-urls.ts),
// puis défensivement tout pôle connu du code mais absent de la base.
const poleOrder = (
  db
    .query("SELECT poleSlug, COUNT(*) AS n FROM Service GROUP BY poleSlug ORDER BY n DESC, poleSlug ASC")
    .all() as { poleSlug: string; n: number }[]
).map((r) => r.poleSlug);
for (const slug of Object.keys(POLE_LABELS)) {
  if (!poleOrder.includes(slug)) poleOrder.push(slug);
}

const sellers = db
  .query(
    "SELECT slug, isTop, rating, reviewsCount FROM Seller ORDER BY isTop DESC, rating DESC, reviewsCount DESC, slug ASC",
  )
  .all() as SellerRow[];

const posts = db
  .query("SELECT slug, publishedAt FROM BlogPost ORDER BY publishedAt DESC, slug ASC")
  .all() as PostRow[];

db.close();

// ─── Construction de la rotation (ordre de priorité GSC) ────────────────────

interface Entry {
  url: string;
  seg: string; // libellé de segment au pluriel
  n: number; // rang 1-based dans le segment
}

const SEG_ORDER = ["pages clés", "catégories", "services", "vendeurs", "articles de blog"];
const entries: Entry[] = [];

let n = 0;
for (const url of [BASE, `${BASE}/services`, `${BASE}/blog`, `${BASE}/support`]) {
  entries.push({ url, seg: "pages clés", n: ++n });
}
n = 0;
for (const pole of poleOrder) {
  entries.push({ url: `${BASE}/categories/${pole}`, seg: "catégories", n: ++n });
}
n = 0;
for (const s of services) {
  entries.push({ url: `${BASE}/services/${s.slug}`, seg: "services", n: ++n });
}
n = 0;
for (const s of sellers) {
  entries.push({ url: `${BASE}/vendeurs/${s.slug}`, seg: "vendeurs", n: ++n });
}
n = 0;
for (const p of posts) {
  entries.push({ url: `${BASE}/blog/${p.slug}`, seg: "articles de blog", n: ++n });
}

const total = entries.length;
const days: Entry[][] = [];
for (let i = 0; i < total; i += LOT) days.push(entries.slice(i, i + LOT));
const lastDay = days.length;

// Jour de début / fin de chaque segment (pour le récapitulatif du plan).
const segPlan: { seg: string; first: number; last: number; count: number }[] = [];
for (const seg of SEG_ORDER) {
  const idxs = entries.map((e, i) => (e.seg === seg ? i : -1)).filter((i) => i >= 0);
  if (idxs.length === 0) continue;
  segPlan.push({
    seg,
    count: idxs.length,
    first: Math.floor(idxs[0] / LOT) + 1,
    last: Math.floor(idxs[idxs.length - 1] / LOT) + 1,
  });
}

/** En-tête de lot : « pages clés 1-4 + catégories 1-6 » (plages par segment). */
function dayTitle(day: Entry[]): string {
  const parts: string[] = [];
  for (const seg of SEG_ORDER) {
    const ranks = day.filter((e) => e.seg === seg).map((e) => e.n);
    if (ranks.length === 0) continue;
    const min = Math.min(...ranks);
    const max = Math.max(...ranks);
    parts.push(min === max ? `${seg} ${min}` : `${seg} ${min}-${max}`);
  }
  return parts.join(" + ");
}

// ─── Rendu du fichier ─────────────────────────────────────────────────────────

const generatedAt = new Date().toISOString().slice(0, 10);
const lines: string[] = [];

lines.push(RULE);
lines.push("b2bpro.store — SOUMISSION QUOTIDIENNE GSC : LISTE JOURNALIÈRE DES URLs À INDEXER");
lines.push(RULE);
lines.push("");
lines.push(`Généré le ${generatedAt} depuis la base locale (miroir de la production).`);
lines.push(
  `${total} URLs indexables au total : ${SEG_ORDER.map((s) => {
    const p = segPlan.find((x) => x.seg === s);
    return p ? `${p.count} ${s}` : null;
  })
    .filter(Boolean)
    .join(", ")}.`,
);
lines.push("Chaque URL figure individuellement dans sitemap.xml — la rotation ci-dessous");
lines.push("couvre exactement le même périmètre, une seule fois par URL.");
lines.push("");
lines.push("Régénérer à chaque nouvelle page publiée (nouveau service, nouvel article) :");
lines.push("  bun run scripts/gen-gsc-daily.ts        (alias : bun run gen:gsc-daily)");
lines.push("");
lines.push("MODE D'EMPLOI — chaque matin, environ 10 minutes");
lines.push("  1. Ouvrir Google Search Console, propriété https://b2bpro.store");
lines.push("  2. Barre « Inspection d'URL » (en haut) -> coller une URL du lot du jour");
lines.push("  3. « Tester la diffusion » -> « Demander l'indexation » -> URL suivante");
lines.push(`  4. Quota GSC : environ ${LOT} demandes par jour et par propriété — chaque lot`);
lines.push(`     « JOUR N » ci-dessous contient exactement ${LOT} URLs (le dernier lot : le reste).`);
lines.push("  Astuce anti-gaspillage : si l'inspection répond « l'URL est sur Google », ne pas");
lines.push("  re-demander l'indexation (sauf contenu significativement mis à jour) — passer");
lines.push("  à l'URL suivante pour garder le quota pour les pages réellement nouvelles.");
lines.push("");
lines.push(`PLAN DE LA ROTATION — ${lastDay} jours (~${LOT} URLs/jour)`);
for (const p of segPlan) {
  const when = p.first === p.last ? `Jour ${p.first}` : `Jours ${p.first} à ${p.last}`;
  let what: string;
  switch (p.seg) {
    case "pages clés":
      what = "pages clés (accueil, catalogue, blog, support)";
      break;
    case "catégories":
      what = "pages catégories (les plus fournies d'abord)";
      break;
    case "services":
      what = "fiches service (best-sellers d'abord, ventes décroissantes)";
      break;
    case "vendeurs":
      what = "profils vendeurs (« top » et mieux notés d'abord)";
      break;
    default:
      what = "articles de blog (les plus récents d'abord)";
  }
  lines.push(`  ${when.padEnd(14)}: ${p.count} ${what}`);
}
lines.push(`Une fois le jour ${lastDay} soumis, tout le site a été proposé à l'indexation.`);
lines.push("");
lines.push(RULE);
lines.push(`ROTATION — ${lastDay} lots (~${LOT} URLs/jour, le dernier : le reste) — soumettre le lot « JOUR N » puis passer au lendemain`);
lines.push(RULE);
lines.push("");

for (let d = 0; d < days.length; d++) {
  const day = days[d];
  lines.push(`JOUR ${d + 1} — ${dayTitle(day)} (${day.length} URLs)`);
  lines.push("");
  for (const e of day) lines.push(e.url);
  lines.push("");
}

lines.push(RULE);
lines.push("APRÈS LA ROTATION — ROUTINE FIXE QUOTIDIENNE (3 URLs, environ 3 minutes)");
lines.push(RULE);
lines.push("");
lines.push("Rotation terminée : ne plus re-demander les pages déjà indexées. Chaque jour,");
lines.push("soumettre uniquement la routine fixe ci-dessous + les nouveautés (section");
lines.push("suivante) le jour même de leur publication.");
lines.push("");
lines.push(`${BASE}`);
lines.push(`${BASE}/services`);
lines.push(`${BASE}/blog`);
lines.push("");
lines.push(RULE);
lines.push("NOUVEAUTÉS — À SOUMETTRE DÈS LE JOUR DE LEUR PUBLICATION");
lines.push(RULE);
lines.push("");
lines.push("Après chaque nouveau service ou nouvel article : régénérer ce fichier, repérer");
lines.push("la nouvelle URL en tête de cette section et la soumettre immédiatement (une");
lines.push("page fraîche est la mieux servie par « Demander l'indexation » : Google ne la");
lines.push("connaît pas encore). Dernières pages publiées à ce jour :");
lines.push("");

const createdAtMs = (v: number | string): number =>
  typeof v === "number" ? v : /^\d+$/.test(v) ? Number(v) : Date.parse(v);
const newestServices = [...services]
  .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt))
  .slice(0, 5);
for (const s of newestServices) {
  lines.push(`${isoDay(s.createdAt)}  ${BASE}/services/${s.slug}`);
}
for (const p of posts.slice(0, 3)) {
  lines.push(`${isoDay(p.publishedAt)}  ${BASE}/blog/${p.slug}`);
}

lines.push("");
lines.push(RULE);
lines.push("TABLEAU DE SUIVI — cocher [x] chaque lot terminé (copie de travail du fichier)");
lines.push(RULE);
lines.push("");
for (let d = 0; d < days.length; d++) {
  lines.push(`[ ] JOUR ${String(d + 1).padStart(2, "0")} — ${dayTitle(days[d])}`);
}
lines.push("");
lines.push("---");
lines.push(`Document généré depuis la base locale le ${generatedAt} — le garder à jour via`);
lines.push("bun run scripts/gen-gsc-daily.ts (procédure complète : docs/GSC-SOUMISSION-SERVICES.md).");
lines.push("");

await Bun.write("docs/GSC-SOUMISSION-QUOTIDIENNE.txt", lines.join("\n"));
console.log(
  `OK — docs/GSC-SOUMISSION-QUOTIDIENNE.txt : ${total} URLs en ${lastDay} lots de ${LOT} (${lines.length} lignes)`,
);
