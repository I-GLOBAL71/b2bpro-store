/**
 * CLI : `bun run migrate:elite`
 *
 * [DONNÉES v1.9.0 — Tour d'élites SEO/GEO/AIO] Migration de la base locale :
 *   1. mots-clés primaires → têtes commerciales 3-5 mots (data/gen/elite-keywords.ts,
 *      audit E1) ; l'ancien primaire (phrase verbale longue) est conservé en tête
 *      de longue traîne ; dédoublonnage normatif de la LT (fiche #101 incluse) ;
 *   2. FAQ réordonnée : la question « comment… » (activateur GEO v1.7.0 n°4)
 *      passe en première position ;
 *   3. correctifs de langue : élisions manquantes (« de analyser » → « d'analyser »,
 *      « prestation de intelligence » → « prestation d'intelligence »), sigles et
 *      marques en capitales (EHPAD, BTP, Glassdoor, Uber Eats, CPF, RNA), et 12
 *      nominalisations curatées (« Confiez analyser… » → « Confiez l'analyse de… »).
 *
 * Idempotent : un second passage ne modifie rien.
 * Validation intégrée : 3-5 mots significatifs, sous-chaîne contiguë du titre
 * normalisé, unicité anti-cannibalisation, primaire dans les 250 premiers
 * caractères de la description. Code sortie 1 si une validation échoue.
 *
 * Après migration : `bun run audit:seo` → `bun run audit:content` → `bun run guard`
 * → snapshot → `db:migrate:neon` (protocole docs/REGRESSION-GUARD.md).
 */
import { db } from "../src/lib/db";
import { ELITE_PRIMARIES } from "../data/gen/elite-keywords";

interface KwShape {
  primary: string;
  secondary: string[];
  longTail: string[];
  aiQueries: string[];
  v?: number;
}
interface FaqShape {
  q: string;
  a: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Correctifs de langue globaux (idempotents) ─────────────────────────── */

const ELISION_VERBES =
  /\bde (analyser|extraire|auditer|espionner|identifier|optimiser|améliorer|exporter|organiser|observer|importer|intégrer|automatiser|évaluer|étudier|éditer|examiner|estimer|illustrer|archiver|assembler|orchestrer|adapter|ajuster|actualiser|exploiter|optimiser)\b/gi;
const ELISION_PRESTATION =
  /\bprestation de (intelligence|hôtellerie|influence|audit|immobilier|achat|appui|option|annonce|offre|étude|évaluation|extraction|analyse|action|information|intégration|automatisation|optimisation|édition|indexation|implantation|importation|approvisionnement|informatique|animation|accompagnement)\b/gi;

function fixLangueGlobal(texte: string): string {
  let out = texte;
  out = out.replace(ELISION_VERBES, (_m, v: string) => `d'${v.toLowerCase()}`);
  out = out.replace(ELISION_PRESTATION, (_m, v: string) => `prestation d'${v.toLowerCase()}`);
  out = out.replace(/\behpad\b/g, "EHPAD");
  out = out.replace(/\bbtp\b/g, "BTP");
  out = out.replace(/\bglassdoor\b/g, "Glassdoor");
  out = out.replace(/\buber\s+eats\b/gi, "Uber Eats");
  out = out.replace(/\bcpf\b/g, "CPF");
  out = out.replace(/\brna\b/g, "RNA");
  out = out.replace(/\bcapterra\b/g, "Capterra");
  return out;
}

/* ── Nominalisations curatées (audit E1, Tableau C — par fiche) ─────────── */

const FIXES_PAR_FICHE: { slug: string; find: RegExp; replace: string }[] = [
  {
    slug: "je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor",
    find: /Confiez analyser les avis employés et salaires/g,
    replace: "Confiez l'analyse des avis employés et salaires",
  },
  {
    slug: "je-vais-compiler-les-guides-des-tailles-et-fiches-techniques-marche",
    find: /Confiez compiler les guides/g,
    replace: "Confiez la compilation des guides",
  },
  {
    slug: "je-vais-creer-votre-glossaire-metier-exhaustif-pour-alimenter-une-ia",
    find: /Sous-traitez créer votre glossaire/g,
    replace: "Sous-traitez la création de votre glossaire",
  },
  {
    slug: "je-vais-extraire-300-vraies-questions-posees-sur-google-dans-sa-niche",
    find: /Déléguer extraire 300 vraies questions/g,
    replace: "Déléguer l'extraction de 300 vraies questions",
  },
  {
    slug: "je-vais-lister-les-entreprises-ayant-remporte-des-marches-publics",
    find: /Déléguer lister les entreprises ayant remporté/g,
    replace: "Déléguer le recensement des entreprises ayant remporté",
  },
  {
    slug: "je-vais-realiser-l-audit-complet-de-votre-visibilite-web-vs-3-rivaux",
    find: /Déléguer réaliser l'audit complet/g,
    replace: "Déléguer la réalisation de l'audit complet",
  },
  {
    slug: "je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur",
    find: /Confiez identifier les entreprises qui recrutent/g,
    replace: "Confiez l'identification des entreprises qui recrutent",
  },
  {
    slug: "je-vais-surveiller-les-nouvelles-fonctionnalites-de-vos-concurrents",
    find: /Confiez surveiller les nouvelles fonctionnalités/g,
    replace: "Confiez la surveillance des nouvelles fonctionnalités",
  },
  {
    slug: "je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles",
    find: /Commandez comparer automatiquement les tarifs/g,
    replace: "Commandez la comparaison automatique des tarifs",
  },
  {
    slug: "je-vais-constituer-votre-annuaire-de-professionnels-de-sante-par-ville",
    find: /Déléguer constituer votre annuaire/g,
    replace: "Déléguer la constitution de votre annuaire",
  },
  {
    slug: "je-vais-auditer-tous-les-articles-de-votre-blog-liens-morts-et-dates",
    find: /articles de votre blog liens morts et dates/g,
    replace: "articles de votre blog : liens morts et dates",
  },
  {
    slug: "je-vais-repertorier-les-marques-vendant-sur-amazon-dans-votre-niche",
    find: /Le problème que « répertorier les marques vendant[^»]*» règle/g,
    replace: "Le problème que règle le recensement des marques vendant",
  },
];

async function main() {
  const services = await db.service.findMany();
  const erreurs: string[] = [];
  let primaires = 0;
  let faqs = 0;
  let langue = 0;

  // validations d'ensemble avant toute écriture
  const vus = new Map<string, string>();
  for (const s of services) {
    const nouveau = ELITE_PRIMARIES[s.slug];
    if (!nouveau) continue;
    const mots = nouveau.trim().split(/\s+/).filter((w) => w.length > 2);
    if (mots.length < 3 || mots.length > 5)
      erreurs.push(`${s.slug} : primaire ${mots.length} mots significatifs (hors 3-5)`);
    if (!norm(s.title).includes(norm(nouveau)))
      erreurs.push(`${s.slug} : primaire non contigu dans le titre`);
    if (vus.has(norm(nouveau)))
      erreurs.push(`cannibalisation : « ${nouveau} » → ${vus.get(norm(nouveau))} + ${s.slug}`);
    vus.set(norm(nouveau), s.slug);
  }
  if (erreurs.length) {
    console.error("✗ Validations bloquantes :");
    for (const e of erreurs) console.error(`  ${e}`);
    process.exit(1);
  }

  for (const s of services) {
    const nouveau = ELITE_PRIMARIES[s.slug];
    if (!nouveau) continue;

    let kw: KwShape;
    try {
      kw = JSON.parse(s.keywords) as KwShape;
    } catch {
      erreurs.push(`${s.slug} : keywords JSON illisible`);
      continue;
    }
    let faq: FaqShape[];
    try {
      faq = JSON.parse(s.faq) as FaqShape[];
    } catch {
      erreurs.push(`${s.slug} : faq JSON illisible`);
      continue;
    }

    // 1. primaire + longue traîne (l'ancien part en tête, dédoublonnage normatif)
    const ancien = kw.primary;
    if (ancien && norm(ancien) !== norm(nouveau)) {
      const lt = [ancien, ...(kw.longTail ?? [])];
      const vusLt = new Set<string>();
      kw.longTail = lt.filter((e) => {
        const k = norm(e);
        if (!k || vusLt.has(k)) return false;
        vusLt.add(k);
        return true;
      }).slice(0, 8);
      kw.primary = nouveau;
      primaires++;
    } else if (norm(ancien ?? "") === norm(nouveau)) {
      // déjà migré : s'assurer malgré tout du dédoublonnage de la LT
      const vusLt = new Set<string>();
      kw.longTail = (kw.longTail ?? []).filter((e) => {
        const k = norm(e);
        if (!k || vusLt.has(k)) return false;
        vusLt.add(k);
        return true;
      });
    }

    // 2. FAQ : la question « comment… » passe en tête
    const idx = faq.findIndex((f) => /^comment/i.test((f.q ?? "").trim()));
    if (idx > 0) {
      const [q] = faq.splice(idx, 1);
      faq.unshift(q);
      faqs++;
    } else if (idx === -1) {
      erreurs.push(`${s.slug} : aucune question « comment… » en FAQ`);
    }

    // 3. langue : global + nominalisations curatées de la fiche
    let title = s.title;
    let shortDesc = s.shortDesc;
    let description = s.description;
    const fixe = FIXES_PAR_FICHE.filter((f) => f.slug === s.slug);
    const appliqueGlobal = (t: string) => {
      let out = fixLangueGlobal(t);
      for (const f of fixe) out = out.replace(f.find, f.replace);
      return out;
    };
    shortDesc = appliqueGlobal(shortDesc);
    description = appliqueGlobal(description);
    title = fixLangueGlobal(title);
    // FAQ : sigles et marques (via aller-retour JSON sûr — patterns ciblés uniquement)
    faq = JSON.parse(fixLangueGlobal(JSON.stringify(faq))) as FaqShape[];
    if (title !== s.title || shortDesc !== s.shortDesc || description !== s.description) langue++;

    // contrôle anti-IA : aucun cadratin introduit
    if ([title, shortDesc, description].some((t) => t.includes("—")))
      erreurs.push(`${s.slug} : cadratin introduit par les correctifs`);

    await db.service.update({
      where: { slug: s.slug },
      data: {
        title,
        shortDesc,
        description,
        keywords: JSON.stringify(kw),
        faq: JSON.stringify(faq),
      },
    });
  }

  console.log("═════════════════════════════════════════════════════");
  console.log("  MIGRATION ÉLITE SEO/GEO/AIO — données");
  console.log(`  ${primaires} primaires migrés · ${faqs} FAQ réordonnées · ${langue} fiches à la langue corrigée`);
  if (erreurs.length) {
    console.log(`  ⚠ ${erreurs.length} anomalie(s) :`);
    for (const e of erreurs) console.log(`      ${e}`);
  } else {
    console.log("  ✓ aucune anomalie");
  }
  console.log("═════════════════════════════════════════════════════");
  process.exit(erreurs.length ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("✗ Échec de la migration :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
