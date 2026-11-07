import { db } from "@/lib/db";
import { POLE_LABELS, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** llms.txt — protocole d'accueil des crawlers IA (GEO/AIO). */
export async function GET() {
  const [services, posts] = await Promise.all([
    db.service.findMany({
      select: { slug: true, title: true, shortDesc: true, basePrice: true, deliveryDays: true },
      orderBy: [{ salesCount: "desc" }],
    }),
    db.blogPost.findMany({ select: { slug: true, title: true }, orderBy: [{ publishedAt: "desc" }] }),
  ]);

  const serviceLines = services
    .map((s) => `- [${s.title}](${SITE.url}/services/${s.slug}): ${s.shortDesc.replace(/\n/g, " ").slice(0, 160)} — dès ${s.basePrice} €, ${s.deliveryDays} jours`)
    .join("\n");

  const categoryLines = Object.entries(POLE_LABELS)
    .map(([slug, label]) => `- [${label}](${SITE.url}/categories/${slug}): services experts ${label.toLowerCase()} pour les marchés francophones`)
    .join("\n");

  const postLines = posts
    .map((p) => `- [${p.title}](${SITE.url}/blog/${p.slug})`)
    .join("\n");

  const txt = `# b2bpro.store

> ${SITE.description}

La place de marché des services digitaux B2B francophones : 112 services livrés par des vendeurs vérifiés notés de 4,2 à 5,0 étoiles, dès 25 €, en 2-3 jours ouvrés, avec paiement séquestré. Support IA 7j/7. Couverture : France, Québec, Belgique, Suisse et Afrique francophone.

## Pages essentielles

- [Catalogue des services](${SITE.url}/services): les 112 services B2B filtrables par pôle, prix et note
- [Support IA](${SITE.url}/support): conseiller IA gratuit répondant à toute question sur les services
- [Blog des décideurs](${SITE.url}/blog): guides SEO/GEO/AIO, veille concurrentielle, génération de leads

## Catégories (14 pôles)

${categoryLines}

## Services (les 112)

${serviceLines}

## Guides et articles

${postLines}

## Politique

- Crawlers et assistants IA explicitement autorisés (voir /robots.txt)
- Contenu structuré avec données chiffrées vérifiées et FAQ citables sur chaque page service
- Contact : support IA sur ${SITE.url}/support
`;

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
