/**
 * CLI : `bun run scripts/gsc-optimisation-2026-11-15.ts`
 *
 * [v2.7.0 — Optimisation SEO guidée par les premiers rapports GSC (propriété
 * https://b2bpro.store/, fenêtre 3 mois : 86 impressions, 0 clics)] Deux chantiers
 * validés AVANT écriture (non conforme = REFUS, exit 1, base inchangée) :
 *
 * A. RÉPARATION DES 43 LIENS INTERNES CASSÉS — tous les liens absolus
 *    https://b2bpro.store/services/<slug-court> du blog pointaient vers des
 *    slugs qui N'EXISTENT PAS (404) : zéro maillage blog → fiches service.
 *    Mapping sémantique ancres → slugs réels, chaque cible validée en base.
 *
 * B. RETARGETING GSC DES 4 ARTICLES PORTEURS D'IMPRESSIONS :
 *    • veille-concurrentielle-efficace (31 impr, pos 76,1 — requêtes dominantes
 *      « logiciel de veille concurrentielle » 13 impr, « logiciel de veille
 *      commerciale » 6) : titre remanié « Logiciel de veille concurrentielle… »,
 *      section comparatif logiciels + FAQ budget veille tarifaire distribution.
 *    • seo-local-google-maps (21 impr, pos 66,7 — « local map pack » 9 impr,
 *      « local pack seo » famille) : titre remanié « local pack (map pack) »,
 *      section vocabulaire + FAQ rapport SEO client (geo-grid).
 *    • seo-geo-aio-guide-complet (8 impr, pos 45,8 — questions « quelle
 *      plateforme combine seo et geo ? » pos 10, « comment choisir une solution
 *      de GEO » pos 11) : section « Quelle solution de GEO choisir ? » + FAQ.
 *    • generation-leads-b2b (10 impr, pos 88,9 — « génération de leads b2b »
 *      9 impr) : paragraphe réponse-first + FAQ définition/priorisation.
 *
 * Règles blog respectées par construction (audit:seo / audit:content) : titre
 * ≤ 68 car. (68 = borne de découpe du title tag) et ≤ 75 (audit), excerpt
 * 80-200, ≥ 3 H2, ≥ 3 liens absolus vers /services/, zéro tiret cadratin,
 * aucun nombre figé de services. Idempotent : second passage = aucune écriture.
 */
import { db } from "../src/lib/db";

const SVC = "https://b2bpro.store/services";

// ─── A. Réparation des liens internes cassés (slugs courts → slugs réels) ────
// Mapping établi depuis les ancres exactes de chaque lien (scan du 2026-11-15).
const REPAIRS: Record<string, string> = {
  "analyse-avis-concurrents": "je-vais-espionner-les-avis-negatifs-de-vos-concurrents-pour-les-battre",
  "avis-g2-capterra": "je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra",
  "base-connaissances-ia": "je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia",
  "datasets-faq": "je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses",
  "audit-visibilite-ia": "je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia",
  "detection-annonces-sous-prix": "je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche",
  "detection-entreprises-qui-recrutent": "je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur",
  "detection-levees-de-fonds": "je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci",
  "detection-ruptures-stock": "je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents",
  "exposants-salons": "je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro",
  "fichier-prospection-b2b": "je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie",
  "micro-influenceurs": "je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement",
  "taux-engagement-reel": "je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement",
  "veille-bodacc": "je-vais-identifier-les-nouvelles-entreprises-creees-dans-votre-secteur",
  "veille-boamp": "je-vais-configurer-votre-veille-sur-mesure-des-marches-publics-boamp",
  "veille-buy-box": "je-vais-surveiller-les-variations-de-la-buy-box-sur-vos-produits-amazo",
  "veille-prix-concurrents": "je-vais-surveiller-en-direct-les-prix-et-stocks-de-vos-concurrents",
  "artisans-rge": "je-vais-vous-fournir-la-liste-officielle-des-artisans-certifies-rge",
  "people-also-ask": "je-vais-extraire-300-vraies-questions-posees-sur-google-dans-sa-niche",
};

// ─── B1. Nouveaux titres/excerpts (GSC : requêtes exactes en tête de titre) ───
const TITLES: Record<string, { title: string; excerpt: string }> = {
  "veille-concurrentielle-efficace": {
    title: "Logiciel de veille concurrentielle : comparatif, prix et méthode",
    excerpt:
      "Comparatif des logiciels de veille concurrentielle (alertes, tableurs, plateformes, experts), budgets réels, et la méthode complète en 7 étapes pour industrialiser votre veille prix.",
  },
  "seo-local-google-maps": {
    title: "SEO local : dominer le local pack (map pack) de Google Maps",
    excerpt:
      "Le plan SEO local en 10 étapes pour entrer dans le local pack (le map pack) de Google Maps : fiche Google Business Profile, avis, citations et signaux de proximité.",
  },
};

// ─── B2. Sections insérées AVANT « ## FAQ » (idempotence via leur H2) ────────
const SECTIONS: Record<string, { marker: string; body: string }> = {
  "veille-concurrentielle-efficace": {
    marker: "## Quel logiciel de veille concurrentielle choisir ?",
    body: `## Quel logiciel de veille concurrentielle choisir ?

Un logiciel de veille concurrentielle doit couvrir au minimum trois des cinq dimensions détaillées plus haut (prix, stocks, promotions, avis, contenu) et transformer la donnée collectée en alertes exploitables. Quatre familles se partagent le marché, chacune avec son budget et son bon cas d'usage.

### 1. Les alertes gratuites (Google Alerts, flux RSS)

Google Alerts surveille gratuitement les mentions de vos concurrents dans l'actualité et les nouveautés web. C'est le point de départ indispensable, mais l'outil reste générique : il ne suit ni les prix, ni les stocks, ni les avis structurés. Les flux RSS des blogs et pages promotions complètent la couche « contenu ».

### 2. Les tableurs pilotés (Google Sheets, Excel)

Un tableur couplé aux fonctions d'import (IMPORTHTML, IMPORTXML sous Google Sheets) permet de construire une veille prix maison sur 5 à 15 références. La solution coûte quelques euros par mois mais exige une maintenance régulière : sélecteurs qui changent, sites protégés, données fausses qui s'installent en silence. Au-delà d'une vingtaine de produits suivis, le temps passé dépasse le coût d'une solution professionnelle.

### 3. Les plateformes e-commerce spécialisées

Les éditeurs spécialisés dans le suivi prix, stocks et Buy Box (type Price2Spy ou Competera pour le multicanal, Keepa pour Amazon) industrialisent la collecte avec des historiques de prix, des alertes à seuil et des rapports. Les abonnements se négocient généralement au nombre de produits surveillés et se chiffrent en dizaines à centaines d'euros par mois. À réserver aux catalogues d'envergure : en dessous d'une cinquantaine de produits suivis, le retour sur investissement reste mince.

### 4. La veille exécutée par un expert humain

Pour les besoins ponctuels, les zones géographiques ou les dimensions que les plateformes standardisées ne couvrent pas, un expert qui livre un fichier vérifié reste imbattable en rapport qualité prix. Sur b2bpro.store, la [surveillance directe des prix et stocks de vos concurrents](https://b2bpro.store/services/je-vais-surveiller-en-direct-les-prix-et-stocks-de-vos-concurrents) est livrée dès 30 € par un expert noté 4,6/5, le [suivi des variations de la Buy Box Amazon](https://b2bpro.store/services/je-vais-surveiller-les-variations-de-la-buy-box-sur-vos-produits-amazo) couvre la marketplace, et la [comparaison automatique des tarifs de vos 3 grossistes clés](https://b2bpro.store/services/je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles) traite la distribution dès 35 €.

| Famille | Couverture | Budget indicatif | Quand la choisir |
|---|---|---|---|
| Alertes gratuites | Contenu, actualités | 0 € | Première couverture, complément |
| Tableur piloté | Prix sur peu de références | Quelques €/mois | Petits catalogues maîtrisés |
| Plateforme e-commerce | Prix, stocks, Buy Box à l'échelle | Dizaines à centaines d'€/mois | Catalogues de 50 produits et plus |
| Expert humain | Toutes dimensions, zones sur mesure | Dès 25 € par veille ponctuelle | Données fraîches vérifiées, besoins B2B |

`,
  },
  "seo-local-google-maps": {
    marker: "## Local pack, map pack, 3-pack : le vocabulaire du SEO local",
    body: `## Local pack, map pack, 3-pack : le vocabulaire du SEO local

Le local pack (dit aussi map pack, ou 3-pack lorsqu'il affichait exactement trois fiches) désigne le bloc de résultats enrichi, accompagné d'une carte, qui s'affiche en tête des recherches à intention locale, que la requête soit formulée en français (« artisan Lyon 3 ») ou avec les anglicismes du métier (« local pack SEO », « map pack Google »). Ces termes sont utilisés indifféremment par les agences et les outils de suivi de positions : dans un audit ou un rapport SEO client, « visibilité local pack », « présence map pack » et « entrée dans le 3-pack » mesurent la même réalité.

Trois principes gouvernent ce bloc, quel que soit le nom qu'on lui donne : la pertinence (à quel point la fiche correspond à la requête), la distance (proximité signalée au moment de la recherche) et la notoriété (volume, fraîcheur et note des avis). Le plan en 10 étapes de cet article agit précisément sur ces trois leviers.

`,
  },
  "seo-geo-aio-guide-complet": {
    marker: "## Quelle solution de GEO choisir ?",
    body: `## Quelle solution de GEO choisir ?

Les questions que posent les équipes au moment de s'équiper portent rarement sur la définition du GEO mais sur le choix concret de la solution, souvent avec un outil SEO déjà en production. Quatre critères départagent les offres.

### Une équipe déjà équipée d'un outil SEO : quelle solution de GEO s'adapte le mieux ?

Choisissez une solution GEO complémentaire, pas une plateforme qui prétend remplacer votre socle SEO. Concrètement : conservez votre outil SEO pour les fondamentaux (structure, balises, maillage) et ajoutez une couche GEO qui mesure votre visibilité dans les réponses IA et vous dit quel contenu modifier en priorité. Le signe qu'une solution s'adapte bien à votre situation : elle se connecte à votre suivi existant et ajoute un axe « citations IA » à vos tableaux de bord, sans demander de re-migrer vos contenus.

### Quelle plateforme combine SEO et GEO ?

Les plateformes tout-en-un qui combinent SEO et GEO existent : elles ajoutent à l'analyse classique des pistes d'optimisation orientées moteurs génératifs. La bonne question reste celle des priorités : une équipe qui maîtrise déjà son SEO gagne plus à ajouter une solution GEO spécialisée qu'à remplacer toute sa stack ; une équipe qui part de zéro peut au contraire regarder les offres combinées pour ne pas doubler les coûts.

### Quel outil choisir pour du GEO en plusieurs langues ?

Pour le GEO multilingue, vérifiez trois points avant tout engagement : la couverture effective des réponses IA dans chaque langue cible (tous les moteurs ne se comportent pas identiquement en français, en espagnol ou en allemand), la fraîcheur du référentiel de sources mesurées, et la capacité à produire des recommandations par langue, et non une simple traduction du rapport anglais.

### GetMint, Surfer SEO, Meteoria : comment les comparer ?

Sans départager les éditeurs à votre place, comparez-les sur la grille suivante : la nature du livrable (audit ponctuel, suivi continu, optimisation rédactionnelle), le périmètre mesuré (quels moteurs génératifs, quelles langues, quelle fréquence de collecte), la méthodologie de mesure des citations (sur quel panel de questions réelles) et le modèle de prix à votre volume de pages. Un outil d'optimisation rédactionnelle et une plateforme de mesure de visibilité IA ne répondent pas au même besoin : c'est la première case de la grille à remplir, avant toute comparaison de fonctionnalités.

`,
  },
};

// ─── B3. Questions ajoutées EN TÊTE de la section FAQ ────────────────────────
const FAQS: Record<string, { marker: string; body: string }> = {
  "veille-concurrentielle-efficace": {
    marker: "### Quel est le meilleur logiciel de veille concurrentielle ?",
    body: `### Quel est le meilleur logiciel de veille concurrentielle ?

Il n'existe pas de logiciel universel : les plateformes e-commerce (prix, stocks, Buy Box) servent les catalogles d'envergure, les alertes gratuites couvrent l'actualité et le contenu, et la veille exécutée par un expert reste la plus rentable en dessous d'une cinquantaine de produits suivis. Le critère décisif est la fraîcheur des données : un prix collecté il y a trois semaines ne protège aucune marge.

### Combien coûte une veille tarifaire pour la distribution ?

Comptez 0 € pour un tableur maison sur quelques références, des dizaines à centaines d'euros par mois pour une plateforme spécialisée multicanal, et à partir de 30 € pour une veille tarifaire ponctuelle exécutée et vérifiée par un expert. Sur b2bpro.store, la [comparaison des tarifs de vos 3 grossistes clés](https://b2bpro.store/services/je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles) et le [contrôle des prix pratiqués par vos revendeurs](https://b2bpro.store/services/je-vais-controler-les-prix-pratiques-par-les-revendeurs-de-votre-marqu) livrent ce type de veille, fichier à l'appui.

`,
  },
  "seo-local-google-maps": {
    marker: "### Comment suivre vos positions dans le local pack pour un rapport SEO client ?",
    body: `### Comment suivre vos positions dans le local pack pour un rapport SEO client ?

Pour un rapport SEO client, mesurez la position de la fiche dans le local pack sur un quadrillage de points autour de l'adresse (la méthode du geo-grid), à fréquence hebdomadaire, en notant pour chaque requête cible le rang dans le pack et la présence ou l'absence de la fiche. Présentez l'évolution rang par requête, le delta de semaine en semaine et la corrélation avec les actions menées (avis obtenus, publications, photos). Les données concurrentes visibles dans le pack se collectent manuellement ou via un expert : [l'audit du top 20 des concurrents sur Google Maps local](https://b2bpro.store/services/je-vais-auditer-le-top-20-de-vos-concurrents-sur-google-maps-local) livre ce relevé prêt à intégrer dans le rapport.

`,
  },
  "seo-geo-aio-guide-complet": {
    marker: "### Comment choisir une solution de Generative Engine Optimization (GEO) ?",
    body: `### Comment choisir une solution de Generative Engine Optimization (GEO) ?

Définissez d'abord votre besoin dominant : mesurer votre visibilité dans les réponses IA (priorité mesure) ou produire des contenus optimisés pour être cité (priorité rédaction). Une solution GEO sérieuse couvre au minimum : un audit initial de vos citations sur un panel de questions réelles, un suivi dans le temps et des recommandations actionnables par page. Méfiez-vous des promesses de position garantie dans ChatGPT : personne n'assure une citation d'IA, le GEO travaille la probabilité.

### Faut-il préférer un outil GEO ou un expert humain ?

Les deux jouent des rôles différents : l'outil automatise la mesure à l'échelle, l'expert interprète et priorise les actions à fort impact. Pour démarrer, un audit ponctuel exécuté par un expert cale la stratégie : [l'audit de visibilité dans les IA](https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia) mesure où vos concurrents sont cités et pourquoi, avant d'investir dans un abonnement d'outil.

`,
  },
  "generation-leads-b2b": {
    marker: "### Qu'est-ce que la génération de leads B2B, concrètement ?",
    body: `### Qu'est-ce que la génération de leads B2B, concrètement ?

C'est l'ensemble des actions qui transforment des entreprises inconnues en contacts qualifiés prêts à dialoguer avec vos commerciaux : un lead B2B n'est pas une adresse e-mail dans un fichier, c'est une entreprise identifiée pour un signal daté (elle recrute, elle lève des fonds, elle ouvre une agence), avec un interlocuteur à joindre et un message à lui adresser.

### Quelle stratégie de lead generation B2B prioriser quand on part de zéro ?

Commencez par une seule famille de signaux, les plus rapides à exploiter (entreprises qui viennent de lever des fonds ou qui recrutent activement), avec un fichier frais de 100 à 300 contacts vérifiés et un message daté qui cite le signal. C'est le chemin le plus court vers des rendez-vous mesurables. Les services [détection des entreprises qui recrutent](https://b2bpro.store/services/je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur) et [fichier de prospection B2B frais et vérifié](https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie) livrent ce socle dès 25 €.

`,
  },
};

// ─── B4. Remplacements chirurgicaux (synonymes GSC dès les premiers mots) ───
const REPLACES: { slug: string; from: string; to: string }[] = [
  {
    slug: "veille-concurrentielle-efficace",
    from: "une veille concurrentielle efficace en 2025 consiste à surveiller",
    to: "une veille concurrentielle efficace en 2025 combine le bon logiciel et une méthode de collecte : elle consiste à surveiller",
  },
  {
    slug: "seo-local-google-maps",
    from: "dominer le pack local de Google Maps se joue sur trois facteurs",
    to: "dominer le local pack (le map pack) de Google Maps se joue sur trois facteurs",
  },
  {
    slug: "seo-local-google-maps",
    from: "Le pack local (les 3 premières fiches affichées avec la carte) capte",
    to: "Ce local pack (les 3 premières fiches affichées avec la carte) capte",
  },
];

// ─── B5. Paragraphe réponse-first inséré après le H1 (generation-leads) ─────
const ANSWER_FIRST = {
  slug: "generation-leads-b2b",
  marker: "**La réponse en 30 secondes :** la génération de leads B2B consiste à identifier, au bon moment,",
  body: `**La réponse en 30 secondes :** la génération de leads B2B consiste à identifier, au bon moment, les entreprises qui ont le problème que vous résolvez, puis à les engager avec un message pertinent avant vos concurrents. Les 15 stratégies de ce guide remplacent l'achat de fichiers génériques par l'exploitation de signaux data (levées de fonds, recrutements, créations d'entreprises, intent data) : moins de volume, beaucoup plus de rendez-vous.

`,
};

// ─── Validation (règles audit:seo / audit:content pour le blog) ─────────────
interface PendingUpdate {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  changes: string[];
}

async function main() {
  const posts = await db.blogPost.findMany();
  const serviceSlugs = new Set((await db.service.findMany({ select: { slug: true } })).map((s) => s.slug));

  // Cibles de réparation toutes valides ?
  for (const [short, real] of Object.entries(REPAIRS)) {
    if (!serviceSlugs.has(real)) {
      console.error(`✗ Cible de réparation inexistante en base : ${short} → ${real}`);
      process.exit(1);
    }
  }
  // Liens cités dans les nouveaux contenus tous valides ?
  for (const body of [
    ...Object.values(SECTIONS).map((s) => s.body),
    ...Object.values(FAQS).map((f) => f.body),
    ANSWER_FIRST.body,
  ]) {
    for (const m of body.matchAll(/https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g)) {
      if (!serviceSlugs.has(m[1])) {
        console.error(`✗ Nouveau lien vers un service inexistant : ${m[1]}`);
        process.exit(1);
      }
    }
    if (body.includes("—")) {
      console.error("✗ Tiret cadratin détecté dans un nouveau contenu (règle blog : zéro cadratin).");
      process.exit(1);
    }
  }

  const updates: PendingUpdate[] = [];
  let repaired = 0;

  for (const p of posts) {
    let content = p.content;
    let title = p.title;
    let excerpt = p.excerpt;
    const changes: string[] = [];

    // A. Réparation des liens cassés
    for (const [short, real] of Object.entries(REPAIRS)) {
      const from = `${SVC}/${short}`;
      const to = `${SVC}/${real}`;
      const n = content.split(from).length - 1;
      if (n > 0) {
        content = content.split(from).join(to);
        repaired += n;
        changes.push(`lien réparé ×${n} : ${short}`);
      }
    }

    // B1. Titre/excerpt + première ligne H1 du contenu synchronisée
    const t = TITLES[p.slug];
    if (t && p.title !== t.title) {
      title = t.title;
      excerpt = t.excerpt;
      if (content.startsWith("# ")) {
        content = `# ${title}` + content.slice(content.indexOf("\n"));
      }
      changes.push("titre + excerpt remaniés (retargeting GSC)");
    }

    // B2. Section avant « ## FAQ »
    const sec = SECTIONS[p.slug];
    if (sec && !content.includes(sec.marker) && content.includes("\n## FAQ\n")) {
      content = content.replace("\n## FAQ\n", `\n${sec.body}\n## FAQ\n`);
      changes.push("section insérée avant FAQ");
    }

    // B3. Questions en tête de la FAQ
    const faq = FAQS[p.slug];
    if (faq && !content.includes(faq.marker) && content.includes("## FAQ\n\n")) {
      content = content.replace("## FAQ\n\n", `## FAQ\n\n${faq.body}`);
      changes.push("questions ajoutées en tête de FAQ");
    }

    // B4. Remplacements chirurgicaux
    for (const r of REPLACES) {
      if (r.slug !== p.slug) continue;
      if (content.includes(r.to)) continue; // déjà appliqué
      if (!content.includes(r.from)) {
        console.error(`✗ Ancre introuvable pour remplacement chirurgical dans ${p.slug} : « ${r.from} »`);
        process.exit(1);
      }
      content = content.split(r.from).join(r.to);
      changes.push("remplacement chirurgical (synonyme GSC en début d'article)");
    }

    // B5. Paragraphe réponse-first (generation-leads-b2b)
    if (p.slug === ANSWER_FIRST.slug && !content.includes(ANSWER_FIRST.marker) && content.startsWith("# ")) {
      const firstBreak = content.indexOf("\n\n");
      if (firstBreak > 0) {
        content = content.slice(0, firstBreak + 2) + ANSWER_FIRST.body + content.slice(firstBreak + 2);
        changes.push("paragraphe réponse-first inséré après le H1");
      }
    }

    if (changes.length === 0) continue;

    // ── Validation de l'état résultant AVANT écriture ──────────────────────
    const emdash = (content.match(/—/g) ?? []).length;
    const fixedCount = (content.match(/\b\d{2,3}\s+services\b/g) ?? []).length;
    const h2 = (content.match(/^## /gm) ?? []).length;
    const svcLinks = (content.match(/https:\/\/b2bpro\.store\/services\//g) ?? []).length;
    const words = content.split(/\s+/).length;
    const titleRetargeted = TITLES[p.slug] !== undefined && title !== p.title;
    const problems: string[] = [];
    if (title.length > 75) problems.push(`title ${title.length} car. > 75 (audit)`);
    if (titleRetargeted && title.length > 68) problems.push(`title ${title.length} car. > 68 (title tag tronqué)`);
    if (excerpt.length < 80 || excerpt.length > 200) problems.push(`excerpt ${excerpt.length} car. hors 80-200`);
    if (emdash > 0) problems.push(`${emdash} tiret(s) cadratin(s)`);
    if (fixedCount > 0) problems.push(`${fixedCount} nombre(s) figé(s) de services`);
    if (h2 < 3) problems.push(`${h2} H2 seulement`);
    if (svcLinks < 3) problems.push(`${svcLinks} lien(s) /services/ seulement`);
    if (content.length < 1500) problems.push("contenu < 1500 car.");
    if (words < 800) problems.push(`< 800 mots`);
    if (problems.length) {
      console.error(`✗ ${p.slug} non conforme après transformation : ${problems.join(" ; ")}`);
      process.exit(1);
    }

    updates.push({ slug: p.slug, title, excerpt, content, changes });
  }

  if (updates.length === 0) {
    console.log("✓ Déjà appliqué : aucune écriture (idempotent).");
    return;
  }

  for (const u of updates) {
    await db.blogPost.update({ where: { slug: u.slug }, data: { title: u.title, excerpt: u.excerpt, content: u.content } });
    console.log(`✓ /blog/${u.slug}`);
    for (const c of u.changes) console.log(`    · ${c}`);
  }
  console.log(`\nOK — ${updates.length} article(s) mis à jour, ${repaired} lien(s) interne(s) réparé(s).`);

  // Vérification finale : plus aucun lien cassé ?
  const after = await db.blogPost.findMany();
  let broken = 0;
  for (const p of after) {
    for (const m of p.content.matchAll(/https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g)) {
      if (!serviceSlugs.has(m[1])) {
        broken++;
        console.error(`  ✗ encore cassé : /blog/${p.slug} → /services/${m[1]}`);
      }
    }
  }
  if (broken > 0) {
    console.error(`✗ ${broken} lien(s) encore cassé(s) — échec.`);
    process.exit(1);
  }
  console.log("✓ Scan final : 0 lien interne cassé vers /services/.");
}

main()
  .catch((e) => {
    console.error("✗ Erreur :", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
