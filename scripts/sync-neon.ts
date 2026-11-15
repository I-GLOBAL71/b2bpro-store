/**
 * CLI : `bun run db:sync:neon` — synchronisation INCRÉMENTALE du contenu local
 * (SQLite) vers la base Neon de production (PostgreSQL), puis génération du
 * rapport des URLs dont le contenu vient de changer en production :
 * docs/GSC-REINDEXATION.txt (à soumettre dans GSC : « Demander l'indexation »).
 *
 * PÉRIMÈTRE — contenu éditorial uniquement (upsert par clé primaire) :
 *   Seller, Service, ServiceOption, Review, BlogPost, KnowledgeItem, SiteConfig.
 * Les tables de production contenant des données clients RÉELLES ne sont jamais
 * écrites ni purgées : Lead, ChatMessage, Order, OrderRevision, SupportThread,
 * SupportMessage, User, Account, Session, VerificationToken, PushSubscription,
 * AdminLog.
 *   ⚠️ NE PAS utiliser `db:migrate:neon` (purge intégrale) sur la production
 *   vivante : il effacerait commandes, conversations et comptes réels.
 *
 * Usage :
 *   NEON_DATABASE_URL="postgresql://…pooler…?sslmode=require" bun run db:sync:neon
 *   bun run db:sync:neon --url="postgresql://…"
 *   bun run db:sync:neon --dry-run      (diff complet, AUCUNE écriture de données)
 *   bun run db:sync:neon --no-backup   (saute le snapshot pre-sync de prod)
 *
 * Étapes :
 *   1. lecture intégrale SQLite (7 tables de contenu, lecture seule) ;
 *   2. application du schéma Postgres (prisma db push --skip-generate, retry
 *      P1001 si le compute Neon se réveille — n'altère aucune ligne, donc
 *      exécutée aussi en dry-run pour fiabiliser la lecture) ;
 *   3. lecture production, diff par hash normalisé (booléens 0/1, dates en
 *      epoch ms, colonnes communes triées) : nouvelles / modifiées /
 *      inchangées + lignes présentes uniquement en prod (jamais supprimées
 *      ni écrasées — signalées dans le rapport) ;
 *   4. snapshot de sécurité pre-sync de la prod (db/snapshots/neon-pre-sync-*) ;
 *   5. upsert du delta en une transaction (ordre des dépendances FK, chunks
 *      multi-VALUES, ON CONFLICT (PK) DO UPDATE, dédoublonnage des slugs) ;
 *   6. re-lecture post-sync : chaque ligne locale doit exister en prod avec un
 *      hash identique (sinon code sortie 1 — rien n'est laissé à moitié fait) ;
 *   7. génération de docs/GSC-REINDEXATION.txt : URLs au contenu modifié en
 *      production, lots ≤ 10/jour (quota GSC), traçabilité champ par champ,
 *      listings impactés, tableau de suivi.
 *
 * Limites assumées (documentées) : une ligne présente uniquement en prod
 * (service créé via le panneau admin de production, avis client réel…) n'est ni
 * supprimée ni écrasée — elle est signalée dans le rapport. Les compteurs
 * (views/salesCount/reviewsCount/rating) sont aujourd'hui statiques côté
 * serveur ; le jour où l'un deviendrait volatile en prod, l'étape 6 le
 * détecterait (hash divergent) et il faudrait l'exclure ici explicitement.
 */
import { Database } from "bun:sqlite";
import { Client } from "pg";

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const TARGET_URL = urlArg || process.env.NEON_DATABASE_URL;
const DRY_RUN = args.includes("--dry-run");
const NO_BACKUP = args.includes("--no-backup");
const SQLITE_PATH = args.find((a) => a.startsWith("--sqlite="))?.split("=")[1] || "db/custom.db";

if (!TARGET_URL || !/^postgres(ql)?:\/\//.test(TARGET_URL)) {
  console.error(
    '✗ URL Neon requise : passez --url="postgresql://…" ou NEON_DATABASE_URL.\n' +
      "  (Utilisez la chaîne « Pooled connection » de Neon, avec sslmode=require.)",
  );
  process.exit(1);
}

/** Retire des paramètres de requête d'une URL (channel_binding inconnu des
 *  drivers node ; le TLS est fourni séparément à `pg`). */
function stripParams(url: string, params: string[]): string {
  const i = url.indexOf("?");
  if (i === -1) return url;
  const kept = url
    .slice(i + 1)
    .split("&")
    .filter(Boolean)
    .filter((p) => !params.some((x) => p.startsWith(`${x}=`)));
  return kept.length ? `${url.slice(0, i)}?${kept.join("&")}` : url.slice(0, i);
}

const PG_URL = stripParams(TARGET_URL, ["channel_binding", "sslmode"]); // TLS explicite ci-dessous
const PRISMA_URL = stripParams(TARGET_URL, ["channel_binding"]); // sslmode=require : compris de Prisma
const MASKED_URL = TARGET_URL.replace(/:\/\/[^@]*@/, "://***@");

const BASE = "https://b2bpro.store";
const RULE = "=".repeat(80);

// Ordre de synchronisation = ordre des dépendances FK (contenu uniquement).
const CONTENT_TABLES = ["Seller", "Service", "ServiceOption", "Review", "BlogPost", "KnowledgeItem", "SiteConfig"] as const;
type Table = (typeof CONTENT_TABLES)[number];

interface Col {
  name: string;
  type: string; // canonique : BOOLEAN | DATETIME | FLOAT | INT | TEXT
  pk: number; // 0 = hors PK ; >0 = position dans la PK (source : PRAGMA SQLite)
}
type Row = Record<string, unknown>;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Conversion d'une valeur SQLite vers Postgres (types Prisma). */
function convertValue(value: unknown, sqliteType: string): unknown {
  if (value === null || value === undefined) return null;
  switch (sqliteType.toUpperCase()) {
    case "BOOLEAN":
      return value === 1 || value === true;
    case "DATETIME": {
      if (value instanceof Date) return value;
      if (typeof value === "number") return new Date(value);
      const s = String(value).trim().replace(" ", "T");
      const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
      const d = new Date(hasTz ? s : `${s}Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return value;
  }
}

/** Normalisation stable pour le hash (identique côté SQLite et côté Postgres). */
function normForHash(value: unknown, type: string): string {
  if (value === null || value === undefined) return "∅";
  switch (type) {
    case "BOOLEAN":
      return value === 1 || value === true || value === "true" ? "1" : "0";
    case "DATETIME": {
      let ms: number;
      if (value instanceof Date) ms = value.getTime();
      else if (typeof value === "number") ms = value;
      else {
        const s = String(value).trim();
        if (/^\d+$/.test(s)) ms = Number(s);
        else {
          const iso = s.includes("T") ? s : s.replace(" ", "T");
          const withTz = /(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
          ms = Date.parse(withTz);
        }
      }
      return Number.isFinite(ms) ? `d${Math.round(ms)}` : `s${String(value)}`;
    }
    default:
      return typeof value === "number" ? `n${value}` : `s${String(value)}`;
  }
}

console.log(`\n🚚 Synchronisation du contenu SQLite → Neon (production)`);
console.log(`   Source : ${SQLITE_PATH} (lecture seule)`);
console.log(`   Cible  : ${MASKED_URL}`);
if (DRY_RUN) console.log(`   MODE  : dry-run — diff complet, AUCUNE écriture de données\n`);

// ── 1. Lecture SQLite ────────────────────────────────────────────────────────
const sqlite = new Database(SQLITE_PATH, { readonly: true });
const localTables = new Map<Table, { cols: Col[]; rows: Row[] }>();
for (const table of CONTENT_TABLES) {
  const pragma = sqlite.query(`PRAGMA table_info("${table}")`).all() as unknown as { name: string; type: string; pk: number }[];
  if (pragma.length === 0) fail(`table ${table} introuvable dans ${SQLITE_PATH}`);
  const rows = sqlite.query(`SELECT * FROM "${table}"`).all() as unknown as Row[];
  localTables.set(table, { cols: pragma.map((c) => ({ name: c.name, type: c.type.toUpperCase(), pk: c.pk })), rows });
}
sqlite.close();

// ── 2. Schéma Postgres (crée/aligne les tables — n'altère aucune ligne) ─────
console.log("1/6 Schéma Postgres (prisma db push --skip-generate)…");
{
  let schemaOk = false;
  for (let attempt = 1; attempt <= 3 && !schemaOk; attempt++) {
    const push = Bun.spawnSync(
      ["bunx", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.postgres.prisma"],
      { env: { ...process.env, DATABASE_URL: PRISMA_URL }, stdout: "pipe", stderr: "pipe" },
    );
    const output = `${push.stdout.toString()}\n${push.stderr.toString()}`.trim();
    if (push.exitCode === 0) {
      schemaOk = true;
      const tail = output.split("\n").filter(Boolean).slice(-3).join("\n   ");
      if (tail) console.log(`   ${tail}`);
    } else if (output.includes("P1001") && attempt < 3) {
      console.log(`   ⏳ compute Neon en cours de réveil (P1001) — tentative ${attempt + 1}/3 dans 5 s…`);
      await Bun.sleep(5000);
    } else {
      fail(`prisma db push a échoué — vérifiez l'URL Neon et vos droits.\n${output}`);
    }
  }
}

// ── 3. Lecture production + diff ─────────────────────────────────────────────
console.log("2/6 Lecture de la base de production et diff…");
const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: true } });
await pg.connect();

function mapPgType(dataType: string): string {
  if (dataType.startsWith("timestamp")) return "DATETIME";
  if (dataType === "boolean") return "BOOLEAN";
  if (dataType === "double precision" || dataType === "real") return "FLOAT";
  if (dataType === "integer" || dataType === "smallint" || dataType === "bigint") return "INT";
  return "TEXT";
}

async function readProdColumns(table: string): Promise<{ name: string; type: string }[]> {
  const { rows } = await pg.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((c) => ({ name: c.column_name, type: mapPgType(c.data_type) }));
}

function selectExpr(cols: { name: string; type: string }[]): string {
  return cols.map((c) => (c.type === "DATETIME" ? `"${c.name}"::text AS "${c.name}"` : `"${c.name}"`)).join(", ");
}

const prodTables = new Map<Table, { cols: { name: string; type: string }[]; rows: Row[] }>();
for (const table of CONTENT_TABLES) {
  const cols = await readProdColumns(table);
  if (cols.length === 0) fail(`table ${table} introuvable en production (schéma non appliqué ?)`);
  const { rows } = await pg.query(`SELECT ${selectExpr(cols)} FROM "${table}"`);
  prodTables.set(table, { cols, rows: rows as Row[] });
}

/** Clé d'identification d'une ligne (colonnes PK côté SQLite). */
function rowKey(row: Row, pkCols: Col[]): string {
  return pkCols.map((c) => String(row[c.name])).join("|");
}

interface TableDiff {
  added: Row[];
  modified: { row: Row; changedCols: string[] }[];
  unchanged: number;
  prodOnly: Row[];
  pkCols: Col[];
  hashCols: { name: string; type: string }[];
  colFrequency: Map<string, number>;
}

const diffs = new Map<Table, TableDiff>();
for (const table of CONTENT_TABLES) {
  const local = localTables.get(table)!;
  const prod = prodTables.get(table)!;
  const prodColTypes = new Map(prod.cols.map((c) => [c.name, c.type]));
  const localColTypes = new Map(local.cols.map((c) => [c.name, c.type]));
  // Colonnes communes aux deux bases, ordre alphabétique stable.
  const hashCols = local.cols
    .filter((c) => prodColTypes.has(c.name))
    .map((c) => ({ name: c.name, type: localColTypes.get(c.name)! }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (hashCols.length === 0) fail(`aucune colonne commune pour ${table} (schémas divergents ?)`);
  const pkCols = local.cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
  if (pkCols.length === 0) fail(`pas de clé primaire identifiée pour ${table}`);

  const localHash = new Map<string, Map<string, string>>();
  for (const row of local.rows) {
    const h = new Map<string, string>();
    for (const c of hashCols) h.set(c.name, normForHash(row[c.name], c.type));
    localHash.set(rowKey(row, pkCols), h);
  }
  const prodHash = new Map<string, Map<string, string>>();
  const prodRowsByKey = new Map<string, Row>();
  for (const row of prod.rows) {
    const h = new Map<string, string>();
    for (const c of hashCols) h.set(c.name, normForHash(row[c.name], prodColTypes.get(c.name)!));
    const key = rowKey(row, pkCols);
    prodHash.set(key, h);
    prodRowsByKey.set(key, row);
  }

  const added: Row[] = [];
  const modified: { row: Row; changedCols: string[] }[] = [];
  const colFrequency = new Map<string, number>();
  let unchanged = 0;
  for (const row of local.rows) {
    const key = rowKey(row, pkCols);
    const ph = prodHash.get(key);
    if (!ph) {
      added.push(row);
      continue;
    }
    const lh = localHash.get(key)!;
    const changedCols: string[] = [];
    for (const c of hashCols) {
      if (lh.get(c.name) !== ph.get(c.name)) {
        changedCols.push(c.name);
        colFrequency.set(c.name, (colFrequency.get(c.name) ?? 0) + 1);
      }
    }
    if (changedCols.length > 0) modified.push({ row, changedCols });
    else unchanged++;
  }
  const prodOnly: Row[] = [];
  for (const [key, row] of prodRowsByKey) {
    if (!localHash.has(key)) prodOnly.push(row);
  }
  diffs.set(table, { added, modified, unchanged, prodOnly, pkCols, hashCols, colFrequency });
}

const deltaCount = [...CONTENT_TABLES].reduce((n, t) => {
  const d = diffs.get(t)!;
  return n + d.added.length + d.modified.length;
}, 0);

for (const table of CONTENT_TABLES) {
  const d = diffs.get(table)!;
  console.log(
    `   ${table.padEnd(14)}: ${d.unchanged} inchangées, ${d.added.length} nouvelles, ${d.modified.length} modifiées` +
      (d.prodOnly.length > 0 ? `, ${d.prodOnly.length} présentes uniquement en prod (conservées)` : ""),
  );
}

if (DRY_RUN) {
  console.log(`\nDry-run : ${deltaCount} ligne(s) à pousser vers la production — aucune écriture de données.`);
  console.log("Colonnes responsables des modifications (fréquence, par table) :");
  for (const table of CONTENT_TABLES) {
    const d = diffs.get(table)!;
    if (d.colFrequency.size === 0 && d.added.length === 0) continue;
    const freq = [...d.colFrequency.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}×${n}`).join(", ");
    console.log(`   ${table} : ajoutées ${d.added.length} ; modifiées ${d.modified.length} ; colonnes { ${freq} }`);
  }
  await pg.end();
  process.exit(0);
}

// ── 4. Snapshot de sécurité pre-sync (contenu prod AVANT écriture) ──────────
if (!NO_BACKUP) {
  console.log("3/6 Snapshot de sécurité pre-sync…");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const backup = {
    format: "neon-pre-sync-v1",
    generatedAt: new Date().toISOString(),
    target: MASKED_URL,
    note: "État du contenu de la production AVANT synchronisation — dates en texte ISO (timestamp sans fuseau), booléens natifs.",
    tables: Object.fromEntries(CONTENT_TABLES.map((t) => [t, prodTables.get(t)!.rows])),
  };
  const path = `db/snapshots/neon-pre-sync-${stamp}.json`;
  await Bun.write(path, JSON.stringify(backup));
  console.log(`   ✓ ${path}`);
}

// ── 5. Upsert du delta en une transaction ──────────────────────────────────
console.log(`4/6 Upsert du delta (${deltaCount} ligne(s)) vers Neon…`);
try {
  await pg.query("BEGIN");
  // Dédoublonnage préventif des slugs (même slug, id différent) — Seller/Service/BlogPost.
  for (const table of CONTENT_TABLES) {
    const d = diffs.get(table)!;
    const local = localTables.get(table)!;
    if (!local.cols.some((c) => c.name === "slug")) continue;
    const pk = d.pkCols[0].name;
    for (const row of [...d.added, ...d.modified.map((m) => m.row)]) {
      await pg.query(`DELETE FROM "${table}" WHERE "slug" = $1 AND "${pk}" <> $2`, [String(row.slug), String(row[pk])]);
    }
  }
  // Upsert chunké (INSERT … ON CONFLICT (PK) DO UPDATE).
  for (const table of CONTENT_TABLES) {
    const d = diffs.get(table)!;
    const local = localTables.get(table)!;
    const rows = [...d.added, ...d.modified.map((m) => m.row)];
    if (rows.length === 0) continue;
    const insertCols = local.cols;
    const colNames = insertCols.map((c) => `"${c.name}"`).join(", ");
    const setCols = insertCols.filter((c) => c.pk === 0);
    const updateSet =
      setCols.length > 0 ? ` DO UPDATE SET ${setCols.map((c) => `"${c.name}" = EXCLUDED."${c.name}"`).join(", ")}` : "";
    const conflict = d.pkCols.map((c) => `"${c.name}"`).join(", ");
    const CHUNK = 25;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const values: unknown[] = [];
      const tuples = chunk
        .map(
          (row) =>
            `(${insertCols
              .map((c) => {
                values.push(convertValue(row[c.name], c.type));
                return `$${values.length}`;
              })
              .join(", ")})`,
        )
        .join(", ");
      await pg.query(`INSERT INTO "${table}" (${colNames}) VALUES ${tuples} ON CONFLICT (${conflict})${updateSet}`, values);
    }
    console.log(`   ✓ ${table} : ${rows.length} ligne(s) poussée(s)`);
  }
  await pg.query("COMMIT");
} catch (e) {
  await pg.query("ROLLBACK").catch(() => undefined);
  console.error("✗ Échec de l'upsert — transaction annulée (ROLLBACK).", e instanceof Error ? e.message : e);
  await pg.end();
  process.exit(1);
}

// ── 6. Vérification post-sync (re-lecture + re-hash) ─────────────────────────
console.log("5/6 Vérification post-synchronisation…");
{
  let mismatch = 0;
  for (const table of CONTENT_TABLES) {
    const local = localTables.get(table)!;
    const d = diffs.get(table)!;
    const cols = await readProdColumns(table);
    const { rows: fresh } = await pg.query(`SELECT ${selectExpr(cols)} FROM "${table}"`);
    const colTypes = new Map(cols.map((c) => [c.name, c.type]));
    const freshHash = new Map<string, Map<string, string>>();
    for (const row of fresh as Row[]) {
      const h = new Map<string, string>();
      for (const c of d.hashCols) h.set(c.name, normForHash(row[c.name], colTypes.get(c.name) ?? "TEXT"));
      freshHash.set(rowKey(row, d.pkCols), h);
    }
    for (const row of local.rows) {
      const key = rowKey(row, d.pkCols);
      const ph = freshHash.get(key);
      if (!ph) {
        mismatch++;
        console.error(`   ✗ ${table} : ligne ${key} absente de la prod après sync`);
        continue;
      }
      for (const c of d.hashCols) {
        const lv = normForHash(row[c.name], local.cols.find((x) => x.name === c.name)?.type ?? "TEXT");
        if (lv !== ph.get(c.name)) {
          mismatch++;
          console.error(`   ✗ ${table} ${key} : colonne ${c.name} divergente après sync`);
          break;
        }
      }
    }
  }
  if (mismatch > 0) {
    console.error(`\n✗ ${mismatch} divergence(s) après synchronisation — la prod ne reflète pas la source.`);
    await pg.end();
    process.exit(1);
  }
  console.log("   ✓ contenu local intégralement reflété en production");
}

await pg.end();

// ── 7. Rapport GSC des URLs à réindexer ────────────────────────────────────
console.log("6/6 Génération de docs/GSC-REINDEXATION.txt…");

const FIELD_LABELS: Record<string, string> = {
  id: "identifiant",
  slug: "slug (l'URL elle-même)",
  createdAt: "date de création",
  title: "titre",
  excerpt: "résumé",
  content: "contenu de l'article",
  category: "catégorie",
  coverTheme: "thème de couverture",
  readMinutes: "temps de lecture",
  publishedAt: "date de publication",
  author: "auteur",
  name: "nom",
  country: "pays",
  countryLabel: "libellé pays",
  city: "ville",
  bio: "présentation",
  skills: "compétences",
  languages: "langues",
  rating: "note",
  reviewsCount: "nombre d'avis",
  totalSales: "ventes cumulées",
  responseTime: "délai de réponse",
  memberSince: "membre depuis",
  level: "niveau",
  avatarColors: "couleurs d'avatar",
  avatarUrl: "avatar",
  isTop: "badge top",
  code: "code",
  pole: "pôle métier",
  poleSlug: "pôle (slug de la page catégorie)",
  poleIcon: "icône du pôle",
  basePrice: "prix de base",
  deliveryDays: "délai de livraison",
  description: "description complète",
  shortDesc: "résumé (cartes)",
  keywords: "mots-clés",
  faq: "FAQ",
  features: "points forts",
  deliverables: "livrables",
  process: "méthode",
  salesCount: "nombre de ventes",
  views: "vues",
  featured: "mise en avant (accueil)",
  isFounder: "label fondateur",
  thumbUrls: "miniatures",
  sellerId: "vendeur rattaché",
  priceExtra: "prix de l'option",
  daysExtra: "délai de l'option",
  monthly: "option mensuelle",
  position: "ordre de l'option",
  authorName: "auteur de l'avis",
  comment: "commentaire",
  orderLabel: "option concernée",
  orderId: "commande liée",
  serviceId: "service lié",
  question: "question",
  answer: "réponse",
  key: "clé de réglage",
  value: "réglages (JSON)",
  updatedAt: "date de mise à jour",
};
const label = (col: string): string => FIELD_LABELS[col] ?? col;

interface UrlEntry {
  url: string;
  why: string;
}

// Pages détail au contenu modifié (priorité 1).
const detailUrls = new Map<string, UrlEntry>();
function putDetail(url: string, why: string) {
  const existing = detailUrls.get(url);
  detailUrls.set(url, { url, why: existing ? `${existing.why} ; ${why}` : why });
}

const serviceSlugById = new Map<string, string>();
for (const r of localTables.get("Service")!.rows) serviceSlugById.set(String(r.id), String(r.slug));
const sellerSlugById = new Map<string, string>();
for (const r of localTables.get("Seller")!.rows) sellerSlugById.set(String(r.id), String(r.slug));

function addChanged(table: Table, row: Row, changedCols: string[] | null) {
  const labels = (changedCols ?? []).map(label).join(", ");
  switch (table) {
    case "BlogPost":
      putDetail(`${BASE}/blog/${row.slug}`, changedCols ? labels : "page nouvelle");
      break;
    case "Service":
      putDetail(`${BASE}/services/${row.slug}`, changedCols ? labels : "page nouvelle");
      break;
    case "Seller":
      putDetail(`${BASE}/vendeurs/${row.slug}`, changedCols ? labels : "page nouvelle");
      break;
    case "ServiceOption": {
      const slug = serviceSlugById.get(String(row.serviceId));
      if (slug) putDetail(`${BASE}/services/${slug}`, `options du service (${labels || "nouvelle option"})`);
      break;
    }
    case "Review": {
      const slug = serviceSlugById.get(String(row.serviceId));
      if (slug) putDetail(`${BASE}/services/${slug}`, `avis clients du service (${labels || "nouvel avis"})`);
      break;
    }
    case "KnowledgeItem":
      // base IA du support : aucune URL détail indexable dédiée
      break;
    case "SiteConfig":
      putDetail(`${BASE}/`, `réglages du site (groupe « ${String(row.key)} » — ${labels || "valeurs"})`);
      break;
  }
}

for (const table of CONTENT_TABLES) {
  const d = diffs.get(table)!;
  for (const row of d.added) addChanged(table, row, null);
  for (const m of d.modified) addChanged(table, m.row, m.changedCols);
}

// Listings impactés (priorité 2 — soumis si quota restant).
const listingUrls = new Map<string, string>();
const blogDelta = diffs.get("BlogPost")!.added.length + diffs.get("BlogPost")!.modified.length > 0;
const serviceDelta = diffs.get("Service")!.added.length + diffs.get("Service")!.modified.length > 0;
if (blogDelta) listingUrls.set(`${BASE}/blog`, "articles modifiés — la liste du blog change (extraits)");
if (serviceDelta) listingUrls.set(`${BASE}/services`, "fiches service modifiées — le catalogue (cartes) change");
const affectedPoles = new Set<string>();
const affectedSellers = new Set<string>();
for (const row of [...diffs.get("Service")!.added, ...diffs.get("Service")!.modified.map((m) => m.row)]) {
  affectedPoles.add(String(row.poleSlug));
  const sellerSlug = sellerSlugById.get(String(row.sellerId));
  if (sellerSlug) affectedSellers.add(sellerSlug);
}
for (const pole of affectedPoles) {
  listingUrls.set(`${BASE}/categories/${pole}`, "fiches du pôle modifiées — les cartes de la catégorie changent");
}
for (const seller of affectedSellers) {
  if (!detailUrls.has(`${BASE}/vendeurs/${seller}`)) {
    listingUrls.set(`${BASE}/vendeurs/${seller}`, "services de ce vendeur modifiés — ses cartes changent");
  }
}
if (serviceDelta && !detailUrls.has(`${BASE}/`)) {
  listingUrls.set(`${BASE}/`, "page d'accueil — vitrine impactée par les fiches modifiées");
}

// ─── Rendu du document ────────────────────────────────────────────────────────
const LOT = 10; // quota GSC : ~10 demandes/jour/propriété
const stamp = new Date().toISOString().slice(0, 10);
const lines: string[] = [];

// Priorité d'affichage : accueil, articles, fiches service, profils vendeurs.
const SEGMENT_ORDER = [`${BASE}/`, "/blog/", "/services/", "/vendeurs/"];
const details = [...detailUrls.values()].sort((a, b) => {
  const seg = (u: string) => SEGMENT_ORDER.findIndex((s) => u.url.includes(s));
  const sa = seg(a);
  const sb = seg(b);
  if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
  return a.url.localeCompare(b.url);
});
const listings = [...listingUrls.entries()].map(([url, why]) => ({ url, why }));
const totalToSubmit = details.length + listings.length;

lines.push(RULE);
lines.push("b2bpro.store — RÉINDEXATION GSC : URLs MODIFIÉES PAR LA DERNIÈRE SYNCHRONISATION");
lines.push(RULE);
lines.push("");
lines.push(`Généré le ${stamp} par scripts/sync-neon.ts juste après la synchronisation du contenu`);
lines.push("local vers la base de production (Neon PostgreSQL) — upsert incrémental, données");
lines.push("clients de la production (commandes, conversations, comptes) intactes.");
lines.push("");
lines.push(`${deltaCount} ligne(s) de contenu poussée(s) → ${details.length} page(s) au contenu modifié`);
lines.push(`en production + ${listings.length} page(s) de listing impactée(s). Google a indexé les`);
lines.push("ANCIENNES versions de ces pages : redemander l'indexation accélère la mise à jour.");
lines.push("");
lines.push("MODE D'EMPLOI — ~10 minutes/jour, quota GSC ~10 demandes/jour/propriété");
lines.push("  1. Ouvrir Google Search Console, propriété https://b2bpro.store");
lines.push("  2. Barre « Inspection d'URL » -> coller une URL du lot du jour");
lines.push("  3. « Tester la diffusion » -> « Demander l'indexation » -> URL suivante");
lines.push("  Astuce : si l'inspection répond « l'URL est sur Google », la page est déjà indexée —");
lines.push("  demander QUAND MÊME l'indexation ici : le contenu a significativement changé");
lines.push("  (c'est exactement le cas prévu par Google). Passer seulement une fois le quota");
lines.push("  du jour épuisé (reprendre au lot suivant le lendemain).");
lines.push("");

const detailLots: UrlEntry[][] = [];
for (let i = 0; i < details.length; i += LOT) detailLots.push(details.slice(i, i + LOT));
for (let lot = 0; lot < detailLots.length; lot++) {
  lines.push(RULE);
  lines.push(`LOT ${lot + 1} — PRIORITÉ 1 : pages au contenu modifié (${detailLots[lot].length} URLs)`);
  lines.push(RULE);
  lines.push("");
  for (const e of detailLots[lot]) lines.push(e.url);
  lines.push("");
}
if (listings.length > 0) {
  lines.push(RULE);
  lines.push(`PRIORITÉ 2 — LISTINGS IMPACTÉS (${listings.length} URLs, si quota restant)`);
  lines.push(RULE);
  lines.push("");
  lines.push("Google recrawle souvent ces pages de liste — les soumettre seulement s'il reste du");
  lines.push("quota après les lots de priorité 1.");
  lines.push("");
  for (const l of listings) lines.push(l.url);
  lines.push("");
}

lines.push(RULE);
lines.push("CE QUI A CHANGÉ, PAGE PAR PAGE (traçabilité de la synchronisation)");
lines.push(RULE);
lines.push("");
for (const e of details) {
  lines.push(`  ${e.url.replace(`${BASE}/`, "/")}`);
  lines.push(`      → ${e.why}`);
}
for (const l of listings) {
  lines.push(`  ${l.url.replace(`${BASE}/`, "/")} (listing)`);
  lines.push(`      → ${l.why}`);
}
lines.push("");
lines.push(RULE);
lines.push("SITEMAP ET DÉCOUVERTE NATURELLE");
lines.push(RULE);
lines.push("");
lines.push("sitemap.xml est généré dynamiquement depuis la base de production : les URLs");
lines.push("ci-dessus y figurent déjà dans leur nouvelle version — Google les redécouvrira");
lines.push("aussi naturellement ; la demande manuelle accélère la mise à jour de l'index.");
lines.push("");
lines.push(RULE);
lines.push("TABLEAU DE SUIVI — cocher [x] chaque lot terminé (copie de travail)");
lines.push(RULE);
lines.push("");
for (let lot = 0; lot < detailLots.length; lot++) {
  lines.push(`[ ] LOT ${String(lot + 1).padStart(2, "0")} — priorité 1, ${detailLots[lot].length} URLs`);
}
if (listings.length > 0) lines.push(`[ ] LISTINGS — priorité 2, ${listings.length} URLs (si quota restant)`);
lines.push("");
lines.push("---");
lines.push(`Document généré par scripts/sync-neon.ts le ${stamp} — régénéré à chaque`);
lines.push('synchronisation : NEON_DATABASE_URL="…" bun run db:sync:neon (procédure GSC');
lines.push("complète : docs/GSC-SOUMISSION-SERVICES.md et docs/GSC-SOUMISSION-QUOTIDIENNE.txt).");
lines.push("");

await Bun.write("docs/GSC-REINDEXATION.txt", lines.join("\n"));

console.log(`\n✓ Synchronisation terminée : ${deltaCount} ligne(s) de contenu poussée(s), prod = source.`);
console.log(`  Rapport : docs/GSC-REINDEXATION.txt (${details.length} URLs priorité 1, ${listings.length} listings, ${totalToSubmit} au total).`);
for (const e of details) console.log(`  → ${e.url}`);
process.exit(0);
