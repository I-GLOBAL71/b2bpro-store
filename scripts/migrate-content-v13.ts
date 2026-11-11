/**
 * CLI : `bun run migrate:content-v13`
 *
 * Migration de contenu [v1.3.0] — clarification du PROCESS DE PAIEMENT partout :
 *  le client règle À LA COMMANDE (avant le travail), les fonds restent EN SÉQUESTRE,
 *  et ne sont transmis au vendeur qu'après LIVRAISON + VALIDATION du client.
 *
 *  1. FAQ des services : 2 formulations erronées corrigées (« vous ne payez qu'une
 *     fois le livrable validé » / « le paiement part uniquement après validation »).
 *  2. Descriptions des services : 6 formulations trompeuses corrigées (« paiement à
 *     la livraison », « validation avant tout paiement », etc.).
 *  3. Base de connaissances IA : synchronisée depuis data/gen/knowledge.ts
 *     (2 entrées précisées + 1 nouvelle entrée dédiée au moment du paiement).
 *
 *  DÉTERMINISTE et IDEMPOTENTE : un second passage n'écrit plus rien.
 *  Sources (data/gen/humanize.ts + data/gen/knowledge.ts) déjà corrigées → tout
 *  futur re-seed produit les mêmes contenus corrects.
 */
import { db } from "../src/lib/db";
import { KNOWLEDGE } from "../data/gen/knowledge";

// ── Replacements littéraux sur les FAQ (générées par humanize.ts v12) ────────
const FAQ_FIXES: [string, string][] = [
  [
    "vous ne payez qu'une fois le livrable validé, le montant restant séquestré jusqu'à votre feu vert.",
    "vous payez à la commande, le montant restant séquestré jusqu'à votre feu vert — le vendeur ne touche rien avant votre validation du livrable.",
  ],
  [
    "Le paiement part uniquement après validation du livrable, règle appliquée sur les",
    "Le paiement se fait à la commande et n'est transmis au vendeur qu'après validation du livrable, règle appliquée sur les",
  ],
];

// ── Replacements sur les descriptions (littéraux + regex à captures) ──────────
// Ordre : du plus spécifique au plus général (les motifs avec € d'abord).
const DESC_FIXES: { re: RegExp; to: string; label: string }[] = [
  {
    re: /Sans risque du paiement de [\d,]+ € à la livraison/g,
    to: "Sans risque : paiement séquestré jusqu'à votre validation",
    label: "H2 « Sans risque du paiement… à la livraison »",
  },
  {
    re: /du paiement de ([\d,]+) € à la livraison en ([^,;.)]+)/g,
    to: "du règlement à la commande jusqu'à la livraison en $2",
    label: "bloc géo « du paiement de X € à la livraison en D »",
  },
  {
    re: /du paiement de ([\d,]+) € à la livraison :/g,
    to: "du règlement de $1 € à la commande jusqu'à la validation :",
    label: "intro « du paiement de X € à la livraison : »",
  },
  {
    re: /Le paiement part après votre validation/g,
    to: "Le paiement est débloqué au vendeur après votre validation",
    label: "bloc géo « le paiement part après votre validation »",
  },
  {
    re: /validation de votre part avant tout paiement/g,
    to: "paiement à la commande mais déblocage au vendeur après votre validation",
    label: "bloc géo « validation avant tout paiement »",
  },
  {
    re: /du paiement à la livraison en/g,
    to: "du règlement à la commande jusqu'à la livraison en",
    label: "intro « du paiement à la livraison en D »",
  },
];

async function main() {
  console.log("→ Migration v1.3.0 — clarification du process de paiement (à la commande + séquestre)");

  // ── 1. Descriptions des 113 services ──────────────────────────────────────
  const services = await db.service.findMany({ select: { id: true, slug: true, description: true, faq: true } });
  let descUpdated = 0;
  const descHits: Record<string, number> = {};
  let faqUpdated = 0;
  const faqHits: Record<string, number> = {};
  const problems: string[] = [];

  for (const svc of services) {
    // Description
    let desc = svc.description;
    let touched = false;
    for (const f of DESC_FIXES) {
      const before = desc;
      desc = desc.replace(f.re, f.to);
      const n = before !== desc ? occurrences(before, f.re) : 0;
      if (n > 0) {
        descHits[f.label] = (descHits[f.label] ?? 0) + n;
        touched = true;
      }
    }
    if (touched) {
      await db.service.update({ where: { id: svc.id }, data: { description: desc } });
      descUpdated++;
    }

    // FAQ (JSON [{q, a}])
    try {
      const faq = JSON.parse(svc.faq || "[]") as { q: string; a: string }[];
      let faqTouched = false;
      const fixedFaq = faq.map((f) => {
        let a = f.a;
        for (const [from, to] of FAQ_FIXES) {
          if (a.includes(from)) {
            faqHits[from.slice(0, 48)] = (faqHits[from.slice(0, 48)] ?? 0) + 1;
            a = a.split(from).join(to);
            faqTouched = true;
          }
        }
        return { ...f, a };
      });
      if (faqTouched) {
        await db.service.update({ where: { id: svc.id }, data: { faq: JSON.stringify(fixedFaq) } });
        faqUpdated++;
      }
    } catch {
      problems.push(`FAQ illisible pour ${svc.slug}`);
    }
  }

  // ── 2. Base de connaissances (support IA) synchronisée sur la source ────────
  let kbUpdated = 0;
  let kbCreated = 0;
  for (const k of KNOWLEDGE) {
    const row = await db.knowledgeItem.findFirst({ where: { question: k.question } });
    if (!row) {
      await db.knowledgeItem.create({
        data: { category: k.category, question: k.question, answer: k.answer, keywords: k.keywords },
      });
      kbCreated++;
    } else if (row.answer !== k.answer || row.keywords !== k.keywords) {
      await db.knowledgeItem.update({
        where: { id: row.id },
        data: { answer: k.answer, keywords: k.keywords },
      });
      kbUpdated++;
    }
  }

  // ── 3. Vérification finale : plus AUCUNE formulation erronée en base ────────
  const recheck = await db.service.findMany({ select: { slug: true, description: true, faq: true } });
  let residual = 0;
  for (const svc of recheck) {
    const blob = `${svc.description}\n${svc.faq}`;
    if (
      /ne payez qu.une fois le livrable|paiement part uniquement|paiement de [\d,]+ € à la livraison|paiement part après votre validation|validation de votre part avant tout paiement|Sans risque du paiement/i.test(
        blob
      )
    ) {
      residual++;
      console.log(`  ⚠ résiduel : ${svc.slug}`);
    }
  }

  console.log("──────────────────────────────────────────────");
  console.log(`✓ Descriptions corrigées : ${descUpdated} / ${services.length} services`);
  for (const [label, n] of Object.entries(descHits)) console.log(`   • ${label} : ${n}`);
  console.log(`✓ FAQ corrigées : ${faqUpdated} / ${services.length} services`);
  for (const [label, n] of Object.entries(faqHits)) console.log(`   • « ${label}… » : ${n}`);
  console.log(`✓ Base de connaissances : ${kbUpdated} mises à jour, ${kbCreated} créées`);
  console.log(`✓ Formulations erronées restantes : ${residual}`);
  if (problems.length) {
    console.log("⚠ Problèmes :");
    problems.forEach((p) => console.log(`   - ${p}`));
  }
  if (residual === 0 && problems.length === 0) {
    console.log("→ Migration v1.3.0 terminée : process de paiement cohérent partout. Vérifiez avec : bun run guard");
  }
}

function occurrences(text: string, re: RegExp): number {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return (text.match(new RegExp(re.source, flags)) || []).length;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
