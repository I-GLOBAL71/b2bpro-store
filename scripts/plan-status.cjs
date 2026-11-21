const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const posts = await prisma.blogPost.findMany({ select: { slug: true } });
  const existingSlugs = new Set(posts.map(p => p.slug));

  const text = fs.readFileSync('docs/PLAN-CONTENU-50-ARTICLES-BLOG.md', 'utf8');
  const sections = text.split(/\n(?=\d+\.\s+\*\*Article\s+\d+)/);

  const planArticles = [];

  for (const sec of sections) {
    const numMatch = sec.match(/^\d+\.\s+\*\*Article\s+(\d+)\s*:\*\*/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1], 10);

    const titleMatch = sec.match(/\*\*Titre\s*:\*\*\s*\*(.+?)\*/);
    const slugMatch = sec.match(/\*\*Slug\s*:\*\*\s*`([a-z0-9-]+)`/);
    const kwMatch = sec.match(/\*\*Mot-clé primaire\s*:\*\*\s*`([^`]+)`/);
    const intentMatch = sec.match(/\*\*Intention\s*:\*\*\s*(.+)/);

    const serviceMatches = [...sec.matchAll(/https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g)].map(m => m[1]);

    if (slugMatch) {
      planArticles.push({
        num,
        title: titleMatch ? titleMatch[1].trim() : '',
        slug: slugMatch[1],
        keyword: kwMatch ? kwMatch[1].trim() : '',
        intent: intentMatch ? intentMatch[1].trim() : '',
        services: [...new Set(serviceMatches)],
        exists: existingSlugs.has(slugMatch[1]),
      });
    }
  }

  console.log(`Plan total: ${planArticles.length} articles`);
  const done = planArticles.filter(a => a.exists);
  const todo = planArticles.filter(a => !a.exists);

  console.log(`Déjà en ligne dans la base : ${done.length}`);
  console.log(`Restants à rédiger : ${todo.length}\n`);

  console.log('--- Prochains 10 articles à rédiger ---');
  todo.slice(0, 10).forEach(a => {
    console.log(`[Art #${a.num}] slug: ${a.slug} | kw: "${a.keyword}"`);
    console.log(`   Titre: ${a.title}`);
    console.log(`   Services: ${a.services.slice(0, 3).join(', ')}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
