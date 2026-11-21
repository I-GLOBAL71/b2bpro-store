const { PrismaClient } = require("@prisma/client");
const { Client } = require("pg");

const NEON_URL = process.env.DATABASE_URL_NEON ||
  "postgresql://neondb_owner:npg_FJwsMQ9lY0dI@ep-still-cloud-b98pa22j-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient();

async function main() {
  console.log("═════════════════════════════════════════════════════════");
  console.log("  SYNCHRONISATION ÉDITORIALE VERS NEON (PRODUCTION)");
  console.log("═════════════════════════════════════════════════════════");

  // 1. Lire SQLite local
  console.log("→ Lecture du contenu local SQLite…");
  const localPosts = await prisma.blogPost.findMany({ orderBy: { publishedAt: "asc" } });
  const localServices = await prisma.service.findMany({ orderBy: { slug: "asc" } });
  console.log(`   ${localPosts.length} articles de blog trouvés.`);
  console.log(`   ${localServices.length} services trouvés.\n`);

  // 2. Connexion Neon
  console.log("→ Connexion à Neon PostgreSQL…");
  const pgClient = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();
  console.log("✓ Connecté à Neon avec succès.\n");

  // 3. Synchroniser les articles de blog
  console.log(`→ Synchronisation de ${localPosts.length} articles de blog…`);
  let blogInserted = 0;
  let blogUpdated = 0;

  for (const post of localPosts) {
    const checkRes = await pgClient.query('SELECT "id" FROM "BlogPost" WHERE "slug" = $1', [post.slug]);
    if (checkRes.rows.length === 0) {
      await pgClient.query(
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
    } else {
      await pgClient.query(
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
    }
  }
  console.log(`✓ Articles de blog : ${blogInserted} nouveaux insérés, ${blogUpdated} mis à jour.\n`);

  // 4. Synchroniser les fiches services (patchs de densité de mots-clés et descriptions)
  console.log(`→ Synchronisation des ${localServices.length} fiches services (patchs SEO)…`);
  let servicesUpdated = 0;
  for (const s of localServices) {
    const res = await pgClient.query(
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
  console.log(`✓ Services mis à jour avec les patchs SEO : ${servicesUpdated}/${localServices.length}.\n`);

  // 5. Vérification finale du décompte en base Neon
  const finalCountRes = await pgClient.query('SELECT COUNT(*) AS count FROM "BlogPost"');
  const finalCount = Number(finalCountRes.rows[0].count);
  console.log("─────────────────────────────────────────────────────────");
  console.log(`✓ VÉRIFICATION NEON : ${finalCount} articles de blog sont désormais enregistrés.`);
  console.log("═════════════════════════════════════════════════════════");

  await pgClient.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erreur de synchronisation :", err);
  process.exit(1);
});
