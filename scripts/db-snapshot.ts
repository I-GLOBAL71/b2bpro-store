/**
 * CLI : `bun run db:snapshot`
 *
 * Sauvegarde l'INTÉGRALITÉ de l'état courant de la base (y compris les données
 * runtime que data/seed.ts ne reproduit pas : leads, avis publiés par les
 * visiteurs, conversations du support IA) dans db/snapshots/.
 *
 * Deux fichiers produits :
 *   • db/snapshots/snapshot-<horodatage>.json  (archive datée, à committer)
 *   • db/snapshots/latest.json                 (pointeur « dernière sauvegarde »)
 *
 * RÈGLE (docs/REGRESSION-GUARD.md) : toujours snapshotter AVANT toute
 * implémentation risquée, migration de schéma ou manipulation de données.
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { db } from "../src/lib/db";

const SNAPSHOTS_DIR = path.join(process.cwd(), "db", "snapshots");

async function main() {
  console.log("→ Lecture de la base complète…");
  const [sellers, services, options, reviews, blogPosts, knowledgeItems, leads, chatMessages] =
    await Promise.all([
      db.seller.findMany(),
      db.service.findMany(),
      db.serviceOption.findMany(),
      db.review.findMany(),
      db.blogPost.findMany(),
      db.knowledgeItem.findMany(),
      db.lead.findMany(),
      db.chatMessage.findMany(),
    ]);

  const snapshot = {
    format: "b2bpro-snapshot",
    version: 1,
    takenAt: new Date().toISOString(),
    counts: {
      sellers: sellers.length,
      services: services.length,
      options: options.length,
      reviews: reviews.length,
      blogPosts: blogPosts.length,
      knowledgeItems: knowledgeItems.length,
      leads: leads.length,
      chatMessages: chatMessages.length,
    },
    data: {
      sellers,
      services,
      options,
      reviews,
      blogPosts,
      knowledgeItems,
      leads,
      chatMessages,
    },
  };

  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(SNAPSHOTS_DIR, `snapshot-${stamp}.json`);
  const json = JSON.stringify(snapshot, null, 2);
  writeFileSync(file, json);
  writeFileSync(path.join(SNAPSHOTS_DIR, "latest.json"), json);

  console.log(`✓ Snapshot écrit : ${file}`);
  console.log(
    `  ${snapshot.counts.services} services · ${snapshot.counts.sellers} vendeurs · ${snapshot.counts.options} options · ${snapshot.counts.reviews} avis · ${snapshot.counts.blogPosts} articles · ${snapshot.counts.knowledgeItems} entrées IA · ${snapshot.counts.leads} leads · ${snapshot.counts.chatMessages} messages`
  );
  console.log("  Pensez à committer le snapshot (les données runtime sont ainsi versionnées).");
}

main()
  .catch((e) => {
    console.error("✗ Échec du snapshot :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
