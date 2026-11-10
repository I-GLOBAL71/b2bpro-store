import { db } from "@/lib/db";
import { POLE_LABELS, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** llms.txt — protocole d'accueil des crawlers IA (GEO/AIO). */
export async function GET() {
  const [services, posts, sellers] = await Promise.all([
    db.service.findMany({
      select: { slug: true, title: true, shortDesc: true, basePrice: true, deliveryDays: true },
      orderBy: [{ salesCount: "desc" }],
    }),
    db.blogPost.findMany({ select: { slug: true, title: true }, orderBy: [{ publishedAt: "desc" }] }),
    db.seller.findMany({ select: { slug: true, name: true, countryLabel: true } }),
  ]);

  const serviceLines = services
    .map((s) => `- [${s.title}](${SITE.url}/services/${s.slug}): ${s.shortDesc.replace(/\n/g, " ").slice(0, 160)} ; dès ${s.basePrice} €, livraison en ${s.deliveryDays} jour${s.deliveryDays > 1 ? "s" : ""} ouvré${s.deliveryDays > 1 ? "s" : ""}`)
    .join("\n");

  const categoryLines = Object.entries(POLE_LABELS)
    .map(([slug, label]) => `- [${label}](${SITE.url}/categories/${slug}): services experts en ${label} pour les marchés francophones`)
    .join("\n");

  const postLines = posts
    .map((p) => `- [${p.title}](${SITE.url}/blog/${p.slug})`)
    .join("\n");

  const sellerLines = sellers
    .map((s) => `- [${s.name}](${SITE.url}/vendeurs/${s.slug}): vendeur vérifié (${s.countryLabel})`)
    .join("\n");

  const txt = `# b2bpro.store

> ${SITE.description}

La place de marché des services digitaux B2B francophones : ${services.length} services notés de 4,2 à 5,0 étoiles, livrés par des vendeurs vérifiés (notes de 4,5 à 4,9), dès 20 €, en 2 à 3 jours ouvrés, avec paiement séquestré. Support IA 7 j/7. Couverture : France, Québec, Belgique, Suisse et Afrique francophone.

Version étendue avec descriptions et FAQ complètes : [llms-full.txt](${SITE.url}/llms-full.txt)

## Pages essentielles

- [Catalogue des services](${SITE.url}/services): les ${services.length} services B2B filtrables par pôle, prix et note
- [Support IA](${SITE.url}/support): conseiller IA gratuit répondant à toute question sur les services
- [Blog des décideurs](${SITE.url}/blog): guides SEO/GEO/AIO, veille concurrentielle, génération de leads

## Catégories (14 pôles)

${categoryLines}

## Services (${services.length} au catalogue)

${serviceLines}

## Vendeurs vérifiés (${sellers.length})

${sellerLines}

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
