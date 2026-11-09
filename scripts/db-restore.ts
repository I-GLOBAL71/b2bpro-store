/**
 * CLI : `bun run db:restore`                       → restaure db/snapshots/latest.json
 *       `bun run db:restore <chemin-du-snapshot>`  → restaure une archive précise
 *
 * Reconstruit la base À L'IDENTIQUE (mêmes IDs, donc mêmes relations et mêmes
 * URLs /services/<slug>) depuis un snapshot produit par `bun run db:snapshot`.
 *
 * ⚠️ Écrase totalement l'état courant — à n'utiliser qu'après un incident ou
 * pour annuler une manipulation de données (protocole docs/REGRESSION-GUARD.md).
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { db } from "../src/lib/db";

interface Snapshot {
  format: "b2bpro-snapshot";
  version: number;
  takenAt: string;
  data: {
    sellers: Record<string, unknown>[];
    services: Record<string, unknown>[];
    options: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    blogPosts: Record<string, unknown>[];
    knowledgeItems: Record<string, unknown>[];
    leads: Record<string, unknown>[];
    chatMessages: Record<string, unknown>[];
    /** v1.5.0 — optionnel : réglages admin + journal d'audit (absents des anciens snapshots). */
    siteConfig?: Record<string, unknown>[];
    adminLogs?: Record<string, unknown>[];
  };
}

async function main() {
  const target =
    process.argv[2] && process.argv[2].trim()
      ? path.resolve(process.argv[2])
      : path.join(process.cwd(), "db", "snapshots", "latest.json");

  if (!existsSync(target)) {
    console.error(`✗ Snapshot introuvable : ${target}`);
    console.error("  Lancez d'abord `bun run db:snapshot`, ou indiquez un chemin valide.");
    process.exit(1);
  }

  const snap = JSON.parse(readFileSync(target, "utf-8")) as Snapshot;
  if (snap.format !== "b2bpro-snapshot") {
    console.error("✗ Format de snapshot inconnu — fichier refusé par sécurité.");
    process.exit(1);
  }

  const d = snap.data;
  console.log(`→ Restauration du snapshot du ${snap.takenAt} (${target})`);
  console.log(
    `  ${d.services.length} services · ${d.sellers.length} vendeurs · ${d.options.length} options · ${d.reviews.length} avis · ${d.blogPosts.length} articles · ${d.knowledgeItems.length} entrées IA · ${d.leads.length} leads · ${d.chatMessages.length} messages`
  );

  await db.$transaction(async (tx) => {
    // Ordre enfants → parents (les cascades Prisma nettoieraient le reste)
    await tx.chatMessage.deleteMany();
    await tx.lead.deleteMany();
    await tx.review.deleteMany();
    await tx.serviceOption.deleteMany();
    await tx.service.deleteMany();
    await tx.seller.deleteMany();
    await tx.blogPost.deleteMany();
    await tx.knowledgeItem.deleteMany();
    await tx.siteConfig.deleteMany();
    await tx.adminLog.deleteMany();

    // Ordre parents → enfants, IDs préservés (relations et slugs intacts)
    await tx.seller.createMany({ data: d.sellers as never });
    await tx.service.createMany({ data: d.services as never });
    await tx.serviceOption.createMany({ data: d.options as never });
    await tx.review.createMany({ data: d.reviews as never });
    await tx.blogPost.createMany({ data: d.blogPosts as never });
    await tx.knowledgeItem.createMany({ data: d.knowledgeItems as never });
    await tx.lead.createMany({ data: d.leads as never });
    await tx.chatMessage.createMany({ data: d.chatMessages as never });
    // v1.5.0 — réglages et audit (présents seulement dans les snapshots récents)
    if (d.siteConfig?.length) await tx.siteConfig.createMany({ data: d.siteConfig as never });
    if (d.adminLogs?.length) await tx.adminLog.createMany({ data: d.adminLogs as never });
  });

  console.log("✓ Base restaurée à l'identique (IDs et slugs préservés).");
  console.log("  Exécutez `bun run guard` pour confirmer l'intégrité.");
}

main()
  .catch((e) => {
    console.error("✗ Échec de la restauration :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
