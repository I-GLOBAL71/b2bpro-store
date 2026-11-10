import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { safeJsonParse, type FaqItem, type ServiceKeywords } from "@/lib/contracts";

export const dynamic = "force-dynamic";

/**
 * llms-full.txt — version étendue de llms.txt (protocole GEO/AIO).
 * Contenu complet de chaque fiche service (description markdown + FAQ) pour
 * permettre aux assistants IA des citations longues et vérifiables.
 */

/** Fallback neutre si le champ JSON keywords est absent ou malformé. */
const EMPTY_KEYWORDS: ServiceKeywords = { primary: "", secondary: [], longTail: [] };

export async function GET() {
  const services = await db.service.findMany({
    select: {
      slug: true,
      title: true,
      description: true,
      basePrice: true,
      deliveryDays: true,
      rating: true,
      reviewsCount: true,
      keywords: true,
      faq: true,
    },
    orderBy: [{ salesCount: "desc" }],
  });

  const blocks = services
    .map((s) => {
      // Champs JSON parses défensivement — la route ne lève jamais, même si la
      // base est en cours de transformation (safeJsonParse garantit un fallback).
      const kw = safeJsonParse<ServiceKeywords>(s.keywords, EMPTY_KEYWORDS);
      const faq = safeJsonParse<FaqItem[]>(s.faq, []);
      const motsCles = [kw.primary, ...kw.secondary.slice(0, 4)].filter(Boolean).join(", ");
      const faqLines = faq
        .slice(0, 5)
        .map((f) => `Q: ${f.q}\nR: ${f.a}`)
        .join("\n\n");

      return [
        `## ${s.title}`,
        `URL: ${SITE.url}/services/${s.slug}`,
        `À partir de: ${s.basePrice} € — Délai: ${s.deliveryDays} jours ouvrés — Note: ${s.rating}/5 (${s.reviewsCount} avis)`,
        ...(motsCles ? [`Mots-clés: ${motsCles}`] : []),
        "",
        s.description.trim(),
        ...(faqLines ? ["", "### FAQ", faqLines] : []),
      ].join("\n");
    })
    .join("\n\n");

  const txt = `# b2bpro.store — catalogue étendu

> ${SITE.description}

Fichier étendu : contenu complet des fiches services pour assistants IA (version courte : ${SITE.url}/llms.txt).

La place de marché des services digitaux B2B francophones : ${services.length} services livrés par des vendeurs vérifiés notés de 4,2 à 5,0 étoiles, dès 25 €, en 2-3 jours ouvrés, avec paiement séquestré. Support IA 7j/7. Couverture : France, Québec, Belgique, Suisse et Afrique francophone.

${blocks}
`;

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
