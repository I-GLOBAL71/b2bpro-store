/**
 * CLI : `bun run add:blog -- --slug=mon-nouvel-article`
 *
 * [ADDITIF v1.9.0 — tour d'élites SEO/GEO/AIO, audit E4 P1-2] Création ADDITIVE
 * d'un article de blog depuis sa source `data/blog/<slug>.md`.
 *
 * Porte de qualité SGA™ AVANT insertion (non conforme = REFUSÉ, exit 1) :
 *   - titre ≤ 75 car.
 *   - extrait 80-200 car.
 *   - contenu ≥ 1500 car.
 *   - ≥ 3 H2
 *   - ≥ 3 liens absolus vers /services/
 *   - zéro cadratin (—)
 *   - aucun nombre figé de services
 *   [v2.0.0] NOUVEAU : chaque slug extrait des liens /services/<slug> est
 *   vérifié en base — tout slug inexistant bloque l'insertion (zéro lien cassé).
 *
 * Ne touche JAMAIS les articles existants (slug unique) ; publishedAt = maintenant,
 * author = front-matter ou « Rédaction b2bpro.store » par défaut.
 * Après création : `bun run audit:content` && `bun run audit:seo` && `bun run guard`.
 */
import { readFileSync, existsSync } from "fs";
import { db } from "../src/lib/db";
import { submitNewOrUpdatedContent } from "../src/lib/gsc";

const BLOG_DIR = "data/blog";

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=").slice(1).join("=");

if (!slugArg) {
  console.error('✗ Slug requis : bun run add:blog -- --slug=mon-nouvel-article (source : data/blog/mon-nouvel-article.md)');
  process.exit(1);
}

async function main() {
  const file = `${BLOG_DIR}/${slugArg}.md`;
  if (!existsSync(file)) {
    console.error(`✗ Source introuvable : ${file}`);
    process.exit(1);
  }

  const raw = readFileSync(file, "utf-8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.error("✗ Front-matter manquant (titre, extrait, catégorie requis).");
    process.exit(1);
  }
  const fm: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?$/);
    if (m) fm[m[1]] = m[2];
  }
  const slug = fm.slug || slugArg;

  // ── Idempotence : déjà en base ? ──────────────────────────────────────────
  const existing = await db.blogPost.findUnique({ where: { slug } });
  if (existing) {
    console.log(`✓ Déjà présent en base : /blog/${slug} — aucune action.`);
    return;
  }

  const title = fm.title ?? "";
  const excerpt = fm.excerpt ?? "";
  const content = fmMatch[2].trim();
  const category = fm.category ?? "SEO & Visibilité IA";

  // ── Porte de qualité SGA™ (identique à sync-blog) AVANT insertion ─────────
  const h2 = (content.match(/^##\s/gm) || []).length;
  const svcLinks = (content.match(/https:\/\/b2bpro\.store\/services\//g) ?? []).length;
  const cadratins = ((title + excerpt + content).match(/—/g) ?? []).length;
  const nombresFiges = (content.match(/\b\d{2,3}\s+services\b/g) ?? []).length;
  const problemes: string[] = [];
  if (!title || title.length > 75) problemes.push(`titre ${title?.length ?? 0} car. (≤ 75 requis)`);
  if (excerpt.length < 80 || excerpt.length > 200) problemes.push(`extrait ${excerpt.length} car. (hors 80-200)`);
  if (content.length < 1500) problemes.push(`contenu ${content.length} car. (< 1500)`);
  if (h2 < 3) problemes.push(`${h2} H2 (< 3)`);
  if (svcLinks < 3) problemes.push(`${svcLinks} lien(s) absolu(s) vers /services/ (< 3)`);
  if (cadratins > 0) problemes.push(`${cadratins} cadratin(s)`);
  if (nombresFiges > 0) problemes.push("mention d'un nombre figé de services");
  const codeBlocksCount = (content.match(/```/g) ?? []).length;
  if (codeBlocksCount % 2 !== 0) problemes.push("bloc de code markdown non fermé (nombre impair de ```) — risque de débordement mobile");
  if (problemes.length) {
    console.error(`✗ Article REFUSÉ par la porte de qualité SGA™ (base inchangée) :`);
    for (const p of problemes) console.error(`  - ${p}`);
    process.exit(1);
  }

  // ── [v2.0.0] Vérification anti-lien-cassé : chaque slug /services/<slug> ──
  // doit exister en base. Un slug fantôme = article refusé AVANT insertion.
  const slugsLies = [...content.matchAll(/https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g)]
    .map((m) => m[1]);
  const slugsUniques = [...new Set(slugsLies)];
  const slugsManquants: string[] = [];
  for (const svcSlug of slugsUniques) {
    const svc = await db.service.findUnique({ where: { slug: svcSlug }, select: { slug: true } });
    if (!svc) slugsManquants.push(svcSlug);
  }
  if (slugsManquants.length > 0) {
    console.error(`✗ Article REFUSÉ — ${slugsManquants.length} lien(s) vers /services/ pointent vers des slugs inexistants en base :`);
    for (const s of slugsManquants) console.error(`  - https://b2bpro.store/services/${s} → 404 (slug introuvable)`);
    console.error(`  Corrigez les slugs (consultez les fiches en base) puis relancez.`);
    process.exit(1);
  }
  if (slugsUniques.length > 0) {
    console.log(`✓ Maillage interne validé : ${slugsUniques.length} slug(s) /services/ vérifié(s) en base.`);
  }

  const words = content.split(/\s+/).length;
  const readMinutes = Math.max(4, Math.round(words / 220));

  const created = await db.blogPost.create({
    data: {
      slug,
      title,
      excerpt,
      content,
      category,
      coverTheme: fm.coverTheme || "blog",
      readMinutes,
      publishedAt: new Date(),
      author: fm.author || "Rédaction b2bpro.store",
    },
  });

  console.log("───────────────────────────────────────────────────────");
  console.log(`✓ Article publié : « ${created.title} »`);
  console.log(`  URL        : /blog/${created.slug}`);
  console.log(`  Catégorie  : ${created.category}`);
  console.log(`  Volume     : ${words} mots · ${readMinutes} min de lecture · ${svcLinks} liens vers /services/`);

  // Soumission automatique Google Search Console & IndexNow
  await submitNewOrUpdatedContent({
    type: "blog",
    slug: created.slug,
    title: created.title,
  });

  console.log("  Prochaine étape : bun run audit:content && bun run audit:seo && bun run guard");
}

main()
  .catch((e) => {
    console.error("✗ Échec de la création :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
