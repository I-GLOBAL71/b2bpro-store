const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { Client } = require("pg");

const md5 = (val) => crypto.createHash("md5").update(String(val ?? ""), "utf8").digest("hex");

const NEON_URL =
  process.env.DATABASE_URL_NEON ||
  process.env.NEON_DATABASE_URL ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres") ? process.env.DATABASE_URL : undefined);

if (!NEON_URL) {
  console.error("❌ ERREUR CONFIGURATION : Aucune variable d'environnement DATABASE_URL_NEON ou NEON_DATABASE_URL n'est définie.");
  console.error("Veuillez définir DATABASE_URL_NEON dans votre fichier .env ou vos variables d'environnement.");
  process.exit(1);
}

const prisma = new PrismaClient();

const TRANSIENT_NET_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "57P01",
  "57P03",
]);

function isTransientNetworkError(err) {
  if (!err) return false;
  if (err.code && TRANSIENT_NET_CODES.has(err.code)) return true;
  const msg = String(err.message || "");
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("Query read timeout") ||
    msg.includes("read timeout") ||
    msg.includes("Connection terminated") ||
    msg.includes("Client has encountered a connection error") ||
    msg.includes("timeout expired") ||
    msg.includes("socket")
  );
}

/** Crée un client PostgreSQL Neon avec gestion d'erreur socket non bloquante. */
function createPgClient() {
  const client = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 25000,
    query_timeout: 90000,
  });
  client.on("error", (err) => {
    console.warn(`   ⚠ Socket Neon interrompu (${err.code || err.message}), reconnexion prévue…`);
  });
  return client;
}

/** Ouvre une connexion Neon avec réessai sur réveil du compute serverless. */
async function connectWithRetry(maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = createPgClient();
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.end().catch(() => {});
      if (attempt === maxAttempts || !isTransientNetworkError(err)) throw err;
      console.warn(`   ⏳ Réveil compute Neon (tentative ${attempt}/${maxAttempts}), nouvel essai dans 5 s…`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

function samePostRow(remote, local) {
  if (!remote) return false;
  const remoteTs = remote.publishedAt instanceof Date ? remote.publishedAt.getTime() : new Date(remote.publishedAt).getTime();
  const localTs = local.publishedAt instanceof Date ? local.publishedAt.getTime() : new Date(local.publishedAt).getTime();
  return (
    remote.hTitle === md5(local.title) &&
    remote.hExcerpt === md5(local.excerpt) &&
    remote.hContent === md5(local.content) &&
    remote.hCategory === md5(local.category) &&
    remote.hCover === md5(local.coverTheme) &&
    remote.hAuthor === md5(local.author) &&
    Number(remote.readMinutes) === Number(local.readMinutes) &&
    remoteTs === localTs
  );
}

function sameServiceRow(remote, local) {
  if (!remote) return false;
  return (
    remote.hTitle === md5(local.title) &&
    remote.hDesc === md5(local.description) &&
    remote.hShort === md5(local.shortDesc) &&
    remote.hKeywords === md5(local.keywords) &&
    remote.hFaq === md5(local.faq) &&
    remote.hFeatures === md5(local.features) &&
    remote.hDeliverables === md5(local.deliverables) &&
    remote.hProcess === md5(local.process)
  );
}

async function main() {
  console.log("═════════════════════════════════════════════════════════");
  console.log("  SYNCHRONISATION ÉDITORIALE VERS NEON (PRODUCTION)");
  console.log("═════════════════════════════════════════════════════════");

  let pgClient = null;
  try {
    // 1. Lire SQLite local
    console.log("→ Lecture du contenu local SQLite…");
    const localPosts = await prisma.blogPost.findMany({ orderBy: { publishedAt: "asc" } });
    const localServices = await prisma.service.findMany({ orderBy: { slug: "asc" } });
    console.log(`   ${localPosts.length} articles de blog trouvés.`);
    console.log(`   ${localServices.length} services trouvés.\n`);

    // 2. Connexion Neon (avec réessai en cas de réveil compute)
    console.log("→ Connexion à Neon PostgreSQL…");
    pgClient = await connectWithRetry(4);
    console.log("✓ Connecté à Neon avec succès.\n");

    const queryWithRetry = async (sql, params = [], maxAttempts = 4) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await pgClient.query(sql, params);
        } catch (err) {
          if (attempt === maxAttempts || !isTransientNetworkError(err)) throw err;
          console.warn(
            `   ⚠ Reconnexion Neon suite à coupure réseau (${err.code || err.message}, tentative ${attempt}/${maxAttempts})…`
          );
          await pgClient.end().catch(() => {});
          await new Promise((r) => setTimeout(r, 3000));
          pgClient = await connectWithRetry(3);
        }
      }
    };

    // 3. Synchroniser les articles de blog (lecture groupée par empreinte MD5 + diff ciblé)
    console.log(`→ Lecture de l'état distant Neon et synchronisation de ${localPosts.length} articles…`);
    const remotePostsRes = await queryWithRetry(
      `SELECT "slug", "readMinutes", "publishedAt",
              md5(coalesce("title", '')) AS "hTitle",
              md5(coalesce("excerpt", '')) AS "hExcerpt",
              md5(coalesce("content", '')) AS "hContent",
              md5(coalesce("category", '')) AS "hCategory",
              md5(coalesce("coverTheme", '')) AS "hCover",
              md5(coalesce("author", '')) AS "hAuthor"
       FROM "BlogPost"`
    );
    const remotePostsBySlug = new Map(remotePostsRes.rows.map((r) => [r.slug, r]));

    let blogInserted = 0;
    let blogUpdated = 0;
    let blogUnchanged = 0;

    for (const post of localPosts) {
      const remote = remotePostsBySlug.get(post.slug);
      if (!remote) {
        try {
          await queryWithRetry(
            `INSERT INTO "BlogPost" ("id", "slug", "title", "excerpt", "content", "category", "coverTheme", "readMinutes", "publishedAt", "author")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              post.id,
              post.slug,
              post.title,
              post.excerpt,
              post.content,
              post.category,
              post.coverTheme,
              post.readMinutes,
              post.publishedAt,
              post.author,
            ]
          );
          blogInserted++;
          console.log(`  + Inséré : ${post.slug}`);
          continue;
        } catch (err) {
          if (err && err.code !== "23505") throw err;
        }
      }
      if (samePostRow(remote, post)) {
        blogUnchanged++;
        continue;
      }
      await queryWithRetry(
        `UPDATE "BlogPost"
         SET "title" = $2, "excerpt" = $3, "content" = $4, "category" = $5, "coverTheme" = $6, "readMinutes" = $7, "publishedAt" = $8, "author" = $9
         WHERE "slug" = $1`,
        [
          post.slug,
          post.title,
          post.excerpt,
          post.content,
          post.category,
          post.coverTheme,
          post.readMinutes,
          post.publishedAt,
          post.author,
        ]
      );
      blogUpdated++;
      console.log(`  ↻ Mis à jour : ${post.slug}`);
    }
    console.log(
      `✓ Articles de blog : ${blogInserted} inséré(s), ${blogUpdated} mis à jour, ${blogUnchanged} inchangé(s).\n`
    );

    // 4. Synchroniser les fiches services (lecture groupée par empreinte MD5 + diff ciblé)
    console.log(`→ Synchronisation des ${localServices.length} fiches services (patchs SEO)…`);
    const remoteServicesRes = await queryWithRetry(
      `SELECT "slug",
              md5(coalesce("title", '')) AS "hTitle",
              md5(coalesce("description", '')) AS "hDesc",
              md5(coalesce("shortDesc", '')) AS "hShort",
              md5(coalesce("keywords", '')) AS "hKeywords",
              md5(coalesce("faq", '')) AS "hFaq",
              md5(coalesce("features", '')) AS "hFeatures",
              md5(coalesce("deliverables", '')) AS "hDeliverables",
              md5(coalesce("process", '')) AS "hProcess"
       FROM "Service"`
    );
    const remoteServicesBySlug = new Map(remoteServicesRes.rows.map((r) => [r.slug, r]));

    let servicesUpdated = 0;
    let servicesUnchanged = 0;
    for (const s of localServices) {
      const remote = remoteServicesBySlug.get(s.slug);
      if (sameServiceRow(remote, s)) {
        servicesUnchanged++;
        continue;
      }
      const res = await queryWithRetry(
        `UPDATE "Service"
         SET "title" = $2, "description" = $3, "shortDesc" = $4, "keywords" = $5, "faq" = $6, "features" = $7, "deliverables" = $8, "process" = $9
         WHERE "slug" = $1`,
        [
          s.slug,
          s.title,
          s.description,
          s.shortDesc,
          s.keywords,
          s.faq,
          s.features,
          s.deliverables,
          s.process,
        ]
      );
      if (res.rowCount > 0) servicesUpdated++;
    }
    console.log(
      `✓ Services synchronisés : ${servicesUpdated} mis à jour, ${servicesUnchanged} inchangé(s) (total local ${localServices.length}).\n`
    );

    // 5. Vérification finale du décompte en base Neon
    const finalCountRes = await queryWithRetry('SELECT COUNT(*) AS count FROM "BlogPost"');
    const finalCount = Number(finalCountRes.rows[0].count);
    console.log("─────────────────────────────────────────────────────────");
    console.log(`✓ VÉRIFICATION NEON : ${finalCount} articles de blog sont désormais enregistrés.`);
    console.log("═════════════════════════════════════════════════════════");
  } finally {
    if (pgClient) await pgClient.end().catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error("Erreur de synchronisation :", err);
  process.exit(1);
});
