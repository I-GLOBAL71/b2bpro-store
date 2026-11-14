/**
 * CLI : `bun run emojis:clean` — dé-IA-isation des textes visibles de la plateforme.
 *
 * v2.1.3 — Retire les émoticônes « qui font trop IA » (sparkles ✨, salut 👋,
 * cadenas 🔒 ornemental…) des champs textuels en base :
 *   • SiteConfig.support.welcome   (message d'accueil du chat support)
 *   • ChatMessage.content          (réponses du support IA)
 *   • Service / BlogPost / Review  (sweep de sécurité : ✨ et décoratives)
 *
 * Les symboles TYPOGRAPHIQUES sobres sont conservés : flèches →, coches ✓/✔,
 * étoiles de notation ★, guillemets « », tirets cadratins —. Les émoticônes
 * CITÉES dans un contexte éditorial légitime sont conservées.
 *
 * Idempotent : relancer ne change rien. Déterministe : zéro aléatoire.
 *
 * Usage :
 *   bun run scripts/remove-emojis.ts                # base locale (SQLite, .env)
 *   bun run scripts/remove-emojis.ts --dry-run       # rapport sans écriture
 *
 *   # Production Neon (même convention que db:migrate:neon) :
 *   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run scripts/remove-emojis.ts
 */
import { db } from "../src/lib/db";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const NEON_URL = urlArg || process.env.NEON_DATABASE_URL;
const ON_NEON = Boolean(NEON_URL && /^postgres(ql)?:\/\//.test(NEON_URL));

/** Émoticônes retirées dans TOUS les champs textuels (ornements « trop IA »). */
const STRICT = ["✨", "✨️", "✦", "✧", "🌟", "💫", "👋", "🚀", "🎉", "🤖", "💡"];
/** Émoticônes retirées PARTOUT SAUF citations éditoriales (BlogPost.content les
 *  conserve : ex. l'article sur l'engagement CITE « 🔥🔥 » comme exemple de
 *  commentaire d'influenceur — c'est du contenu journalistique, pas un ornement). */
const HEAVY = ["🔥"];
/** Émoticône retirée UNIQUEMENT en position d'ornement de début de ligne. */
const LINE_PREFIX = ["🔒"];

/** Nettoie une chaîne : strict partout (+ heavy sauf citation), ornementale en préfixe. */
function cleanText(raw: string, allowHeavy = true): { text: string; changed: boolean } {
  let text = raw;
  let changed = false;

  for (const emoji of allowHeavy ? [...STRICT, ...HEAVY] : STRICT) {
    if (text.includes(emoji)) {
      text = text.split(emoji).join("");
      changed = true;
    }
  }
  for (const emoji of LINE_PREFIX) {
    if (text.includes(emoji)) {
      // Uniquement l'emoji COLLÉE en tête de ligne (suivie d'un espace) : ornement.
      text = text.replace(new RegExp(`(^|\\n)${emoji} `, "gu"), "$1");
      if (text !== raw) changed = true;
    }
  }
  if (changed) {
    // Espaces creusées par les retraits : « !  Pour », « ! \n », doubles résiduelles.
    text = text.replace(/ {2,}/g, " ").replace(/ +\n/g, "\n");
  }
  return { text, changed };
}

// ─── Mode production : SQL direct (pg), mêmes corrections que le mode local ───

/** Échappe une chaîne en littéral SQL. */
function qs(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

async function runNeon(): Promise<void> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();

  /** Chaîne SQL : émoticônes retirées, ornementale en tête de ligne. */
  const cleanExpr = (col: string, allowHeavy = true) => {
    let chain = `"${col}"`;
    for (const e of allowHeavy ? [...STRICT, ...HEAVY] : STRICT) chain = `replace(${chain}, ${qs(e)}, '')`;
    for (const e of LINE_PREFIX) chain = `regexp_replace(${chain}, ${qs("(^|\\n)" + e + " ")}, '\\1', 'g')`;
    return `regexp_replace(regexp_replace(${chain}, ' {2,}', ' ', 'g'), ' +\\n', '\\n', 'g')`;
  };

  /** Prédicat SQL : la colonne contient au moins une des émoticônes (selon le groupe). */
  const hasEmojiExpr = (col: string, allowHeavy = true) =>
    "(" +
    [...(allowHeavy ? [...STRICT, ...HEAVY] : STRICT), ...LINE_PREFIX]
      .map((e) => `"${col}" LIKE ${qs("%" + e + "%")}`)
      .join(" OR ") +
    ")";

  // 1. SiteConfig.support (JSON en colonne value) — nettoyage ciblé du champ welcome.
  const statements: { label: string; table: string; set: string; where: string }[] = [
    {
      label: "SiteConfig.support.welcome",
      table: '"SiteConfig"',
      set: `"value" = regexp_replace("value", ${qs("Bonjour et bienvenue sur b2bpro.store ! 👋\n\n")}, ${qs("Bonjour et bienvenue sur b2bpro.store !\n\n")})`,
      where: `"key" = 'support' AND "value" LIKE ${qs("%👋%")}`,
    },
    {
      label: "ChatMessage.content",
      table: '"ChatMessage"',
      set: `"content" = ${cleanExpr("content")}`,
      where: hasEmojiExpr("content"),
    },
  ];
  // 2. Sweep éditorial : mêmes règles sur les champs textuels des contenus publiés.
  // BlogPost.content garde ses CITATIONS (🔥 cité par l'article influenceurs).
  for (const [table, col, allowHeavy] of [
    ["Service", "shortDesc", true], ["Service", "description", true], ["Service", "features", true],
    ["Service", "deliverables", true], ["Service", "process", true], ["Service", "faq", true],
    ["BlogPost", "title", true], ["BlogPost", "excerpt", true], ["BlogPost", "content", false],
    ["Review", "comment", true],
  ] as const) {
    statements.push({
      label: `${table}.${col}`,
      table: `"${table}"`,
      set: `"${col}" = ${cleanExpr(col, allowHeavy)}`,
      where: hasEmojiExpr(col, allowHeavy),
    });
  }

  let total = 0;
  for (const st of statements) {
    const sql = DRY
      ? `SELECT COUNT(*) AS n FROM ${st.table} WHERE ${st.where}`
      : `UPDATE ${st.table} SET ${st.set} WHERE ${st.where} RETURNING 1`;
    const res = await client.query(sql);
    const n = DRY ? Number((res.rows?.[0] as { n?: string })?.n ?? 0) : Number(res.rowCount ?? 0);
    if (n > 0) {
      total += n;
      console.log(`  • ${st.label} : ${n} ligne(s)`);
    }
  }
  console.log(`\n[emojis:clean] ${DRY ? "DRY-RUN — " : ""}${total} correction(s) sur Neon.`);
  await client.end();
}

// ─── Mode local : Prisma (SQLite), accès typés champ par champ ────────────────

async function runLocal(): Promise<void> {
  const rapport: string[] = [];

  // 1. SiteConfig.support.welcome (JSON dans la colonne value)
  const siteSupport = await db.siteConfig.findUnique({ where: { key: "support" } });
  if (siteSupport) {
    try {
      const parsed = JSON.parse(siteSupport.value) as { welcome?: string; [k: string]: unknown };
      if (typeof parsed.welcome === "string") {
        const { text, changed } = cleanText(parsed.welcome);
        if (changed) {
          rapport.push("SiteConfig.support.welcome : émoticône retirée");
          if (!DRY) {
            await db.siteConfig.update({
              where: { key: "support" },
              data: { value: JSON.stringify({ ...parsed, welcome: text }) },
            });
          }
        }
      }
    } catch {
      rapport.push("SiteConfig.support : JSON illisible, ignoré");
    }
  }

  // 2. ChatMessage.content (réponses du support IA)
  const chatMessages = await db.chatMessage.findMany({ select: { id: true, content: true } });
  for (const m of chatMessages) {
    const { text, changed } = cleanText(m.content);
    if (changed) {
      rapport.push(`ChatMessage ${m.id} : émoticône(s) retirée(s)`);
      if (!DRY) {
        await db.chatMessage.update({ where: { id: m.id }, data: { content: text } });
      }
    }
  }

  // 3. Sweep de sécurité : ✨ & décoratives dans les contenus éditoriaux
  // (aucune occurrence aujourd'hui — le sweep garantit la règle dans le temps)
  const services = await db.service.findMany({
    select: { id: true, shortDesc: true, description: true, features: true, deliverables: true, process: true, faq: true },
  });
  for (const s of services) {
    for (const field of ["shortDesc", "description", "features", "deliverables", "process", "faq"] as const) {
      const raw = s[field];
      if (typeof raw !== "string") continue;
      const { text, changed } = cleanText(raw);
      if (changed) {
        rapport.push(`Service ${s.id}.${field} : émoticône(s) retirée(s)`);
        if (!DRY) {
          await db.service.update({ where: { id: s.id }, data: { [field]: text } });
        }
      }
    }
  }

  const posts = await db.blogPost.findMany({ select: { id: true, title: true, excerpt: true, content: true } });
  for (const p of posts) {
    for (const field of ["title", "excerpt", "content"] as const) {
      // BlogPost.content garde ses CITATIONS éditoriales (🔥 cité = contenu, pas ornement).
      const { text, changed } = cleanText(p[field] ?? "", field !== "content");
      if (changed) {
        rapport.push(`BlogPost ${p.id}.${field} : émoticône(s) retirée(s)`);
        if (!DRY) {
          await db.blogPost.update({ where: { id: p.id }, data: { [field]: text } });
        }
      }
    }
  }

  const reviews = await db.review.findMany({ select: { id: true, comment: true } });
  for (const r of reviews) {
    const { text, changed } = cleanText(r.comment);
    if (changed) {
      rapport.push(`Review ${r.id} : émoticône(s) retirée(s)`);
      if (!DRY) {
        await db.review.update({ where: { id: r.id }, data: { comment: text } });
      }
    }
  }

  console.log(`\n[emojis:clean] ${DRY ? "DRY-RUN — " : ""}${rapport.length} correction(s) :`);
  for (const line of rapport) console.log("  •", line);
  if (rapport.length === 0) console.log("  Rien à corriger — base déjà propre.");
}

// ─── Entrée ───────────────────────────────────────────────────────────────────

(ON_NEON ? runNeon() : runLocal())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[emojis:clean] échec :", e);
    process.exit(1);
  });
