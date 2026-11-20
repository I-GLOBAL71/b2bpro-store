/**
 * CLI : `node --env-file=.env scripts/keyword-research.js` ou via tsx
 * Usage :
 *   pnpm dlx tsx --env-file=.env scripts/keyword-research.ts --query="prospection b2b"
 *   pnpm dlx tsx --env-file=.env scripts/keyword-research.ts --pole="ia-rag-data"
 *
 * Outil de recherche et d'expansion de mots-clés à fort trafic et longue traîne
 * pour b2bpro.store (MÉTHODE SGA™ ÉTAPE 1 & ÉTAPE 2).
 *
 * Fonctionnalités :
 * 1. Extraction en temps réel des suggestions Google Suggest (variantes commerciales & conversationnelles)
 * 2. Détection automatique des questions réelles des acheteurs (Génération aiQueries & FAQ)
 * 3. Contrôle anti-cannibalisation croisé avec la base SQLite locale (113 fiches existantes)
 * 4. Détection automatique des services du catalogue à mailler (liens internes obligatoires)
 * 5. Proposition clé en main de template SGA™ (fiche service ou article de blog)
 */

import { db } from "../src/lib/db";
import { POLE_LABELS } from "../src/lib/site";

interface SuggestResult {
  term: string;
  type: "commercial" | "question" | "longtail" | "comparatif";
}

const QUESTION_PREFIXES = [
  "comment",
  "pourquoi",
  "quel est le prix",
  "combien coute",
  "quel est le meilleur",
  "qu est ce que",
  "ou trouver",
  "quelle plateforme",
];

const INTENT_MODIFIERS = [
  "prix",
  "tarif",
  "prestataire",
  "expert",
  "freelance",
  "agence",
  "outil",
  "comparatif",
  "ia",
  "automatisation",
  "avis",
  "exemple",
  "modele",
];

async function fetchGoogleSuggestions(query: string, lang = "fr", country = "fr"): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=${lang}&gl=${country}&q=${encoded}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

async function expandKeywords(seed: string): Promise<SuggestResult[]> {
  const map = new Map<string, SuggestResult>();

  // 1. Suggestions directes
  const direct = await fetchGoogleSuggestions(seed);
  for (const t of direct) {
    if (t.toLowerCase() !== seed.toLowerCase()) {
      map.set(t.toLowerCase(), { term: t, type: "commercial" });
    }
  }

  // 2. Modificateurs d'intention commerciale / comparaison
  for (const mod of INTENT_MODIFIERS.slice(0, 6)) {
    const res = await fetchGoogleSuggestions(`${seed} ${mod}`);
    for (const t of res) {
      if (!map.has(t.toLowerCase())) {
        map.set(t.toLowerCase(), {
          term: t,
          type: mod === "comparatif" || mod === "avis" ? "comparatif" : "commercial",
        });
      }
    }
  }

  // 3. Questions (pour FAQ & aiQueries)
  for (const p of QUESTION_PREFIXES.slice(0, 5)) {
    const res = await fetchGoogleSuggestions(`${p} ${seed}`);
    for (const t of res) {
      if (!map.has(t.toLowerCase())) {
        map.set(t.toLowerCase(), { term: t, type: "question" });
      }
    }
  }

  return Array.from(map.values());
}

async function main() {
  const args = process.argv.slice(2);
  let query = args.find((a) => a.startsWith("--query="))?.split("=")[1];
  const pole = args.find((a) => a.startsWith("--pole="))?.split("=")[1];

  if (!query && !pole) {
    console.log(`
Utilisation :
  pnpm dlx tsx --env-file=.env scripts/keyword-research.ts --query="veille concurrentielle"
  pnpm dlx tsx --env-file=.env scripts/keyword-research.ts --pole="ia-rag-data"

Pôles disponibles :
${Object.entries(POLE_LABELS)
  .map(([slug, name]) => `  - ${slug} (${name})`)
  .join("\n")}
`);
    process.exit(0);
  }

  if (pole && !query) {
    query = POLE_LABELS[pole] || pole.replace(/-/g, " ");
  }

  console.log(`\n═════════════════════════════════════════════════════════`);
  console.log(`  RECHERCHE DE MOTS-CLÉS & EXPANSION TRAFIC — b2bpro.store`);
  console.log(`  Requête graine : « ${query} »`);
  console.log(`═════════════════════════════════════════════════════════\n`);

  console.log(`🔍 Exploration des flux de recherche Google en temps réel...`);
  const suggestions = await expandKeywords(query!);

  const questions = suggestions.filter((s) => s.type === "question").map((s) => s.term);
  const commercials = suggestions.filter((s) => s.type === "commercial").map((s) => s.term);
  const comparatifs = suggestions.filter((s) => s.type === "comparatif").map((s) => s.term);

  console.log(`✓ ${suggestions.length} suggestions réelles extraites.\n`);

  // Vérification croisée avec la base locale pour anti-cannibalisation & maillage
  const allServices = await db.service.findMany({
    select: { slug: true, title: true, keywords: true, poleSlug: true, basePrice: true },
  });

  const exactMatches: { slug: string; title: string; primary: string }[] = [];
  const relatedServices: { slug: string; title: string; price: number }[] = [];

  const qLower = query!.toLowerCase();

  for (const s of allServices) {
    let kwPrimary = "";
    try {
      const parsed = JSON.parse(s.keywords);
      kwPrimary = parsed.primary || "";
    } catch {}

    if (kwPrimary.toLowerCase().includes(qLower) || s.title.toLowerCase().includes(qLower)) {
      exactMatches.push({ slug: s.slug, title: s.title, primary: kwPrimary });
    }

    // Services liés pour le maillage
    if (pole && s.poleSlug === pole) {
      relatedServices.push({ slug: s.slug, title: s.title, price: s.basePrice });
    } else if (!pole && (s.title.toLowerCase().includes(qLower.slice(0, 5)) || s.slug.includes(qLower.slice(0, 5)))) {
      relatedServices.push({ slug: s.slug, title: s.title, price: s.basePrice });
    }
  }

  console.log(`───────────────────────────────────────────────────────`);
  console.log(`1. AUDIT ANTI-CANNIBALISATION (Base b2bpro.store)`);
  console.log(`───────────────────────────────────────────────────────`);
  if (exactMatches.length > 0) {
    console.log(`⚠️  ATTENTION : ${exactMatches.length} fiche(s) existante(s) couvrent déjà ce périmètre :`);
    for (const m of exactMatches.slice(0, 5)) {
      console.log(`   - ${m.title}`);
      console.log(`     URL     : https://b2bpro.store/services/${m.slug}`);
      console.log(`     Primaire: « ${m.primary} »`);
    }
    console.log(`👉 RECOMMANDATION : Utilisez les variantes longue traîne ci-dessous ou créez un ARTICLE DE BLOG ciblant l'intention informative sans cannibaliser la fiche de vente.`);
  } else {
    console.log(`✓ Aucune cannibalisation directe détectée. Territoire sémantique libre pour une NOUVELLE fiche ou un ARTICLE.`);
  }

  console.log(`\n───────────────────────────────────────────────────────`);
  console.log(`2. GRAPPES DE MOTS-CLÉS RETENUES (Méthode SGA™)`);
  console.log(`───────────────────────────────────────────────────────`);
  console.log(`🎯 Mot-clé Primaire Commercial suggéré (3-5 mots) :`);
  const bestCommercial = commercials[0] || `${query} b2b entreprise`;
  console.log(`   « ${bestCommercial} »\n`);

  console.log(`📈 Mots-clés Secondaires & Longue Traîne (${commercials.length} trouvés) :`);
  for (const c of commercials.slice(0, 8)) {
    console.log(`   • ${c}`);
  }

  console.log(`\n🤖 Requêtes Conversationnelles IA (aiQueries & FAQ) :`);
  const topQuestions = questions.slice(0, 6);
  if (topQuestions.length > 0) {
    for (const q of topQuestions) {
      console.log(`   ❓ ${q}`);
    }
  } else {
    console.log(`   ❓ comment réussir sa ${query} ?`);
    console.log(`   ❓ quel est le prix moyen d'une prestation de ${query} ?`);
    console.log(`   ❓ pourquoi externaliser sa ${query} en 2026 ?`);
  }

  console.log(`\n───────────────────────────────────────────────────────`);
  console.log(`3. MAILLAGE INTERNE SUGGÉRÉ (Services existants à linker)`);
  console.log(`───────────────────────────────────────────────────────`);
  const toLink = relatedServices.slice(0, 4);
  if (toLink.length >= 3) {
    console.log(`✓ ${toLink.length} fiches réelles trouvées en base prêtes à être citées dans votre article :`);
    for (const s of toLink) {
      console.log(`   🔗 [${s.title}](https://b2bpro.store/services/${s.slug}) — dès ${s.price} €`);
    }
  } else {
    console.log(`ℹ️  Moins de 3 fiches du même pôle trouvées. Sélectionnez parmi les 113 fiches via 'bun run scripts/gen-gsc-urls.ts'.`);
  }

  console.log(`\n═════════════════════════════════════════════════════════`);
  console.log(`  PRÊT À L'EMPLOI : Vous pouvez copier ces clusters dans`);
  console.log(`  votre fichier markdown data/blog/<slug>.md ou catalog.json.`);
  console.log(`═════════════════════════════════════════════════════════\n`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
