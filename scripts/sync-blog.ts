/**
 * CLI : `bun run scripts/sync-blog.ts`
 *
 * [DONNÉES v1.8.0] Resynchronise les articles de blog de la base locale avec
 * les fichiers sources data/blog/*.md (vérité de source). Utilisé après une
 * correction éditoriale des fichiers markdown pour propager le contenu à la
 * base servie sans re-seed complet.
 *
 * Comportement : par slug, met à jour title / excerpt / content / category /
 * coverTheme / readMinutes ; NE touche JAMAIS slug, publishedAt, author
 * (datation et signature des articles préservées). Les fichiers sans article
 * correspondant sont signalés, jamais créés.
 *
 * Idempotent : un second passage ne modifie rien (les champs déjà égaux
 * sont détectés et laissés tels quels).
 */
import { readFileSync, readdirSync } from "fs";
import { db } from "../src/lib/db";

const BLOG_DIR = "/home/z/my-project/data/blog";

async function main() {
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const posts = await db.blogPost.findMany();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));

  let updated = 0;
  let unchanged = 0;
  let missing: string[] = [];

  for (const f of files) {
    const raw = readFileSync(`${BLOG_DIR}/${f}`, "utf-8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;
    const fm: Record<string, string> = {};
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?$/);
      if (m) fm[m[1]] = m[2];
    }
    const slug = fm.slug || f.replace(".md", "");
    const post = bySlug.get(slug);
    if (!post) {
      missing.push(slug);
      continue;
    }
    const content = fmMatch[2].trim();
    const words = content.split(/\s+/).length;
    const readMinutes = Math.max(4, Math.round(words / 220));
    const title = fm.title || post.title;
    const excerpt = fm.excerpt || post.excerpt;
    const category = fm.category || post.category;
    const coverTheme = fm.coverTheme || post.coverTheme;
    if (
      post.title !== title ||
      post.excerpt !== excerpt ||
      post.content !== content ||
      post.category !== category ||
      post.coverTheme !== coverTheme ||
      post.readMinutes !== readMinutes
    ) {
      await db.blogPost.update({
        where: { slug },
        data: { title, excerpt, content, category, coverTheme, readMinutes },
      });
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`Articles : ${updated} mis à jour · ${unchanged} inchangés · ${missing.length} sans fiche en base${missing.length ? ` (${missing.join(", ")})` : ""}.`);
  if (missing.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("✗ Échec de la synchronisation :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
