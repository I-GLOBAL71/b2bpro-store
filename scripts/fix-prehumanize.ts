/**
 * CLI : `bun run scripts/fix-prehumanize.ts`
 *
 * PASSE 1 du tour d'experts anti-traces d'IA (v1.8.0) — corrections ciblées sur les
 * textes métier AVANT la ré-humanisation :
 *  - titres agrammaticaux (16 fiches) : décimale à point, déterminants manquants,
 *    possessifs sans référent, sigles plaqués ;
 *  - chiffres contradictoires titre ↔ description (8 fiches : 100/50, 20/15, 30/25…) ;
 *  - typographie française : pourcentages collés, décimales à point, doubles espaces ;
 *  - casses de marques et sigles (Buy Box, Uber Eats, Qualiopi, EHPAD, NAF, SIREN…) ;
 *  - coquilles (Churhn, « 10k », « Réel » pour Reel, élisions manquantes) ;
 *  - « Réponse du vendeur en moins de 2 heures » sera reconstruit par la couche
 *    v2 avec le vrai temps de réponse du vendeur (passe 2 : humanize --force).
 *
 * S'applique à la base locale (SQLite) ET au catalogue source (data/catalog.json)
 * pour la reproductibilité des prochains seeds. Idempotent par construction
 * (remplacements de textes : une fois appliqués, les motifs disparaissent).
 */
import { readFileSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";

/* ══ 1. Titres agrammaticaux — {slug: [ancien, nouveau]} ═══════════════════ */
const TITLE_FIXES: Record<string, [string, string]> = {
  "je-vais-lister-les-commerces-locaux-ayant-une-note-inferieure-a-3-8": [
    "note inférieure à 3.8",
    "note inférieure à 3,8",
  ],
  "je-vais-lister-les-fonds-investissement-et-business-angels-actifs": [
    "fonds investissement",
    "fonds d'investissement",
  ],
  "je-vais-recenser-toutes-les-discussions-sur-votre-marque-sur-forums": [
    "sur forums",
    "sur les forums",
  ],
  "je-vais-extraire-300-vraies-questions-posees-sur-google-dans-sa-niche": [
    "dans sa niche",
    "dans votre niche",
  ],
  "je-vais-compiler-les-etudes-scientifiques-sur-votre-sujet-pubmed": [
    "études scientifiques sur votre sujet PubMed",
    "études scientifiques PubMed sur votre sujet",
  ],
  "je-vais-constituer-votre-fichier-de-pharmacies-et-magasins-bio-region": [
    "magasins bio région",
    "magasins bio régionaux",
  ],
  "je-vais-vous-fournir-le-fichier-des-mairies-ciblees-selon-population": [
    "selon population",
    "selon la population",
  ],
  "je-vais-comparer-30-franchises-de-votre-secteur-apport-et-rentabilite": [
    "secteur apport et rentabilité",
    "secteur : apport et rentabilité",
  ],
  "je-vais-cartographier-les-bornes-electriques-et-zones-blanches-region": [
    "bornes électriques et zones blanches région",
    "bornes de recharge et zones blanches de la région",
  ],
  "je-vais-mettre-en-place-votre-veille-sur-les-rappels-de-produits-flux": [
    "rappels de produits flux",
    "flux des rappels de produits",
  ],
  "je-vais-lister-les-associations-sportives-de-votre-departement-rna": [
    "département RNA",
    "département (RNA)",
  ],
  "je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra": [
    "sur G2 Capterra",
    "sur G2 et Capterra",
  ],
  "je-vais-identifier-les-entreprises-avec-postes-vacants-depuis-60j": [
    "depuis +60j",
    "depuis 60 jours",
  ],
  "je-vais-auditer-tous-les-articles-de-votre-blog-liens-morts-et-dates": [
    "blog liens morts et dates",
    "blog : liens morts et dates",
  ],
  "je-vais-compiler-les-guides-des-tailles-et-fiches-techniques-marche": [
    "fiches techniques marché",
    "fiches techniques du marché",
  ],
  "je-vais-repertorier-les-domaines-de-mariage-et-wedding-planners-zone": [
    "wedding planners zone",
    "wedding planners locaux",
  ],
  "je-vais-nettoyer-dedoublonner-et-formater-votre-base-de-contacts-clien": [
    "nettoyer dédoublonner et formater",
    "nettoyer, dédoublonner et formater",
  ],
};

/* ══ 2. Paires ciblées description/process/features — {find, replace} ═════ */
const TARGETED: { find: RegExp; replace: string }[] = [
  // Chiffres contradictoires titre ↔ description
  { find: /j'audite les 15 premiers concurrents locaux/g, replace: "j'audite les 20 premiers concurrents locaux" },
  { find: /je compile pour vous 50 offres d'emploi/g, replace: "je compile pour vous 100 offres d'emploi" },
  { find: /je source pour vous 40 fabricants industriels européens/g, replace: "je source pour vous 50 fabricants industriels européens" },
  { find: /les avis employés anonymes de 4 de vos concurrents/g, replace: "les avis employés anonymes de 5 de vos concurrents" },
  { find: /noms des 4 entreprises concurrentes à auditer/g, replace: "noms des 5 entreprises concurrentes à auditer" },
  { find: /de 15 logiciels de référence de votre marché/g, replace: "de 20 logiciels de référence de votre marché" },
  { find: /j'audite et compare 25 réseaux de franchise/g, replace: "j'audite et compare 30 réseaux de franchise" },
  { find: /je sélectionne pour vous 25 marques indépendantes/g, replace: "je sélectionne pour vous 30 marques indépendantes" },
  { find: /80 avis négatifs \(1 et 2 étoiles\)/g, replace: "80 avis à 1 étoile" },
  // Promesse récurrente incohérente avec l'offre ponctuelle
  { find: /Recevez chaque semaine les appels d'offres publics officiels/g, replace: "Recevez les appels d'offres publics officiels" },
  // Coquilles et anglicismes de format
  { find: /\bChurhn\b/g, replace: "churn" },
  { find: /\(10k à 100k\)/g, replace: "(10 000 à 100 000 abonnés)" },
  { find: /Story, Réel, vidéo dédiée/g, replace: "Story, Reel, vidéo dédiée" },
  { find: /DCE dossier consultation/g, replace: "DCE (dossier de consultation des entreprises)" },
  // Élisions manquantes résiduelles
  { find: /\bde entreprises\b/g, replace: "d'entreprises" },
  { find: /\bde intent\b/g, replace: "d'intent" },
  { find: /\bde audit\b/g, replace: "d'audit" },
  { find: /\bde optimiser\b/g, replace: "d'optimiser" },
  { find: /\bde artisans\b/g, replace: "d'artisans" },
  { find: /\bde annuaire\b/g, replace: "d'annuaire" },
  { find: /\bde import\b/g, replace: "d'import" },
  { find: /\bde extensions\b/g, replace: "d'extensions" },
  { find: /\bde apps\b/g, replace: "d'apps" },
];

/* ══ 3. Normalisations typographiques globales (DB texte uniquement) ══════ */
const GLOBAL: { find: RegExp; replace: string }[] = [
  { find: /(\d)%/g, replace: "$1 %" }, // pourcentage collé
  { find: /(\d)\.(\d+)\s?%/g, replace: "$1,$2 %" }, // décimale à point devant %
  { find: /\b3\.8\b/g, replace: "3,8" },
  { find: /\b3\.2 sur Google\b/g, replace: "3,2 sur Google" },
  { find: /\b98\.6\b/g, replace: "98,6" },
  { find: / {2,}/g, replace: " " }, // doubles espaces
  // Casses marques/sigles (minuscule fautive uniquement)
  { find: /\bla buy box\b/g, replace: "la Buy Box" },
  { find: /\bla buy box amazon\b/gi, replace: "la Buy Box Amazon" },
  { find: /\bgagner la buy box\b/gi, replace: "gagner la Buy Box" },
  { find: /\buber eats\b/g, replace: "Uber Eats" },
  { find: /\bqualiopi\b/g, replace: "Qualiopi" },
  { find: /\b cms précis\b/g, replace: " CMS précis" },
  { find: /\btechnologie ou cms\b/gi, replace: "technologie ou CMS" },
  { find: /\bglassdoor\b/g, replace: "Glassdoor" },
  { find: /\bdes ehpad\b/g, replace: "des EHPAD" },
  { find: /\bcode naf\b/g, replace: "code NAF" },
  { find: /\bnuméros siren\b/g, replace: "numéros SIREN" },
  { find: /\bmots-clés cpv\b/g, replace: "mots-clés CPV" },
  { find: /l'Union Européenne/g, replace: "l'Union européenne" },
  { find: /\burl du site web\b/g, replace: "URL du site web" },
  { find: /\bl'url de\b/g, replace: "l'URL de" },
  { find: /\bd'asins amazon\b/g, replace: "d'ASIN Amazon" },
  { find: /\bdev python\b/g, replace: "dev Python" },
  { find: /\btjm\b/g, replace: "TJM" },
  { find: /\(pdf, photos ou lien web\)/g, replace: "(PDF, photos ou lien web)" },
  { find: /\(excel, csv ou lien google sheets\)/g, replace: "(Excel, CSV ou lien Google Sheets)" },
  { find: /\(excel, csv ou pdf\)/g, replace: "(Excel, CSV ou PDF)" },
  { find: /\bshopify en france\b/g, replace: "Shopify en France" },
  { find: /à rennes budget max/g, replace: "à Rennes, budget max" },
  { find: /studio\/t2 à/g, replace: "studio/T2 à" },
  { find: /\bnon vendues en france\b/g, replace: "non vendues en France" },
  { find: /amazon \(ex :/g, replace: "Amazon (ex :" },
];

function applyText(s: string): { text: string; hits: number } {
  let out = s;
  let hits = 0;
  for (const p of TARGETED) {
    const before = out;
    out = out.replace(p.find, p.replace);
    if (before !== out) hits++;
  }
  for (const p of GLOBAL) {
    const before = out;
    out = out.replace(p.find, p.replace);
    if (before !== out) hits++;
  }
  return { text: out, hits };
}

async function main() {
  /* ── Base locale ─────────────────────────────────────────────────────── */
  const services = await db.service.findMany();
  let titlesFixed = 0;
  let textsFixed = 0;
  for (const s of services) {
    const data: Record<string, string> = {};
    const tf = TITLE_FIXES[s.slug];
    if (tf && s.title.includes(tf[0])) {
      data.title = s.title.replace(tf[0], tf[1]);
      titlesFixed++;
    }
    const d = applyText(s.description);
    if (d.text !== s.description) {
      data.description = d.text;
      textsFixed++;
    }
    for (const field of ["shortDesc", "features", "deliverables", "faq", "process"] as const) {
      const r = applyText(s[field]);
      if (r.text !== s[field]) {
        data[field] = r.text;
        textsFixed++;
      }
    }
    if (Object.keys(data).length > 0) {
      await db.service.update({ where: { slug: s.slug }, data });
    }
  }
  console.log(`Base : ${titlesFixed} titres corrigés · ${textsFixed} champs texte corrigés.`);

  /* ── Catalogue source (reproductibilité des seeds) ───────────────────── */
  const catalogPath = "/home/z/my-project/data/catalog.json";
  const catalog = JSON.parse(readFileSync(catalogPath, "utf-8")) as {
    slug?: string;
    comeupTitle: string;
    description: string;
    instructions?: string;
    options?: { name: string }[];
  }[];
  let catFixed = 0;
  for (const svc of catalog) {
    const before = JSON.stringify(svc);
    const tf = svc.slug ? TITLE_FIXES[svc.slug] : undefined;
    if (tf && svc.comeupTitle.includes(tf[0])) {
      svc.comeupTitle = svc.comeupTitle.replace(tf[0], tf[1]);
    }
    svc.description = applyText(svc.description).text;
    if (svc.instructions) svc.instructions = applyText(svc.instructions).text;
    if (svc.options) for (const o of svc.options) o.name = applyText(o.name).text;
    if (JSON.stringify(svc) !== before) catFixed++;
  }
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Catalogue : ${catFixed} entrées corrigées.`);
}

main()
  .catch((e) => {
    console.error("✗ Échec :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
