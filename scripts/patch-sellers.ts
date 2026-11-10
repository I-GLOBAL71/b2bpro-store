/**
 * CLI : `bun run scripts/patch-sellers.ts`
 *
 * [DONNÉES v1.8.0] Passe bios vendeurs de la base locale au niveau du tour
 * d'experts anti-traces d'IA : tirets cadratins éliminés (15 bios + 3 titres
 * via le fichier générateur data/gen/sellers.ts, déjà corrigé), fautes de
 * français corrigées (élisions, « commande publique », réfléchi « se
 * contentent »). Les bios de la base sont mises au niveau du générateur —
 * les prochains seeds produisent directement le format corrigé.
 *
 * INVARIANTS : seuls les champs `bio` (et `title` pour les 3 titres concernés)
 * sont modifiés. Idempotent : les bios déjà conformes ne sont pas retouchées.
 */
import { db } from "../src/lib/db";

const FIXES: { slug: string; old: string; new: string }[] = [
  {
    "slug": "julien-marchand",
    "old": "Ex-responsable de la prospection dans une scale-up SaaS parisienne, je connais par cœur la mécanique d'un tunnel B2B qui convertit. Mon approche repose sur un constat simple : un bon fichier ne s'achète pas, il se construit à partir de signaux comportementaux récents — recrutements, levées de fonds, créations d'entreprises. Chaque base que je livre est pensée pour déclencher des conversations, pas juste remplir un CRM.",
    "new": "Ex-responsable de la prospection dans une scale-up SaaS parisienne, je connais par cœur la mécanique d'un tunnel B2B qui convertit. Mon approche repose sur un constat simple : un bon fichier ne s'achète pas, il se construit à partir de signaux comportementaux récents : recrutements, levées de fonds, créations d'entreprises. Chaque base que je livre est pensée pour déclencher des conversations, pas juste remplir un CRM."
  },
  {
    "slug": "thomas-fabre",
    "old": "Consultant SEO depuis onze ans, je me suis spécialisé tôt sur le référencement local à une époque où personne n'y croyait. Aujourd'hui je audite les fiches Google Business Profile des concurrents de mes clients catégorie par catégorie, attribut par attribut, photo par photo. Mon plan d'action en dix étapes a déjà fait remonter plus de 200 commerces dans le top 3 du pack local de leur ville.",
    "new": "Consultant SEO depuis onze ans, je me suis spécialisé tôt sur le référencement local à une époque où personne n'y croyait. Aujourd'hui j'audite les fiches Google Business Profile des concurrents de mes clients catégorie par catégorie, attribut par attribut, photo par photo. Mon plan d'action en dix étapes a déjà fait remonter plus de 200 commerces dans le top 3 du pack local de leur ville."
  },
  {
    "slug": "maxime-roussel",
    "old": "Product manager reconverti dans l'analyse concurrentielle produit, je passe mes journées à décortiquer ce que les éditeurs de logiciels montrent — et ce qu'ils cachent. Avis G2 et Capterra disséqués thème par thème, grilles tarifaires reconstituées ligne par ligne, roadmaps déduites des changelogs : mes livrables donnent aux équipes produit une vue d'ensemble impossible à obtenir manuellement.",
    "new": "Product manager reconverti dans l'analyse concurrentielle produit, je passe mes journées à décortiquer ce que les éditeurs de logiciels montrent, et surtout ce qu'ils cachent. Avis G2 et Capterra disséqués thème par thème, grilles tarifaires reconstituées ligne par ligne, roadmaps déduites des changelogs : mes livrables donnent aux équipes produit une vue d'ensemble impossible à obtenir manuellement."
  },
  {
    "slug": "laura-mercier",
    "old": "J'ai commencé ma carrière dans un service de command publique territoriale avant d'aider des PME à y répondre. Je connais la mécanique du BOAMP, des profils d'acheteurs et de la base TED par cœur, ainsi que les pièges qui font rater un DCE. Ma veille est taillée au cordeau : chaque marché livré correspond réellement à votre métier, avec la date limite et le lien direct vers le dossier.",
    "new": "J'ai commencé ma carrière dans un service de commande publique territoriale avant d'aider des PME à y répondre. Je connais la mécanique du BOAMP, des profils d'acheteurs et de la base TED par cœur, ainsi que les pièges qui font rater un DCE. Ma veille est taillée au cordeau : chaque marché livré correspond réellement à votre métier, avec la date limite et le lien direct vers le dossier."
  },
  {
    "slug": "chloe-vasseur",
    "old": "Juriste en droit public détournée par la joie de dénicher des financements, je cartographie les aides depuis six ans pour des associations comme pour des entreprises. Mon truc : traduire les guichets obscurs d'administration en opportunités claires, avec critères d'éligibilité, montants et dates limites. Mes clients disent que je fais apparaître de l'argent là où ils ne voyaient que des pages de conditions.",
    "new": "Juriste en droit public détournée par la joie de dénicher des financements, je cartographie les aides depuis six ans pour des associations comme pour des entreprises. Mon truc : traduire les guichets obscurs de l'administration en opportunités claires, avec critères d'éligibilité, montants et dates limites. Mes clients disent que je fais apparaître de l'argent là où ils ne voyaient que des pages de conditions."
  },
  {
    "slug": "marie-eve-gagnon",
    "old": "Ancienne responsable marketplace pour une bannière de retail québécoise, je surveille les prix et les stocks sur Amazon comme sur les chaînes nord-américaines. La différence avec la plupart des veilleurs : je travaille dans les deux langues et les deux écosystèmes, ce qui double la surface d'analyse. On m'a surnommée « la madame Buy Box » chez mes clients — le surnom est resté.",
    "new": "Ancienne responsable marketplace pour une bannière de retail québécoise, je surveille les prix et les stocks sur Amazon comme sur les chaînes nord-américaines. La différence avec la plupart des veilleurs : je travaille dans les deux langues et les deux écosystèmes, ce qui double la surface d'analyse. On m'a surnommée « la madame Buy Box » chez mes clients ; le surnom est resté."
  },
  {
    "slug": "xavier-bouchard",
    "old": "Je code des assistants conversationnels depuis que ChatGPT a ouvert ses API. Mon terrain de jeu favori : préparer des corpus de données propres avant de brancher le moindre modèle. Trop d'équipes branchent leur IA sur du HTML brut et s'étonnent ensuite des réponses incohérentes. Ma règle du métier — garbage in, garbage out — est devenue la fondation de chacun de mes livrables.",
    "new": "Je code des assistants conversationnels depuis que ChatGPT a ouvert ses API. Mon terrain de jeu favori : préparer des corpus de données propres avant de brancher le moindre modèle. Trop d'équipes branchent leur IA sur du HTML brut et s'étonnent ensuite des réponses incohérentes. Ma règle du métier, garbage in, garbage out, est devenue la fondation de chacun de mes livrables."
  },
  {
    "slug": "florence-lavoie",
    "old": "Ex-responsable des partenariats influence chez un géant du commerce de détail canadien, j'ai signé des collaborations avec plus de 300 créateurs. Mon réseau vivant des deux côtés de l'Atlantique me permet de dénicher des profils francophones que les outils automatisés ne détectent pas. Je calcule l'engagement réel à la main quand il le faut — et je le prouve.",
    "new": "Ex-responsable des partenariats influence chez un géant du commerce de détail canadien, j'ai signé des collaborations avec plus de 300 créateurs. Mon réseau vivant des deux côtés de l'Atlantique me permet de dénicher des profils francophones que les outils automatisés ne détectent pas. Je calcule l'engagement réel à la main quand il le faut, et je le prouve."
  },
  {
    "slug": "amelie-fortin",
    "old": "J'ai commencé par faire monter des commerces québécois dans le pack local, puis j'ai vu arriver la vague des moteurs de réponse. Désormais je forme mes clients au GEO — être cité par ChatGPT, Perplexity et les AI Overviews de Google — avec des méthodes concrètes : structure citable, données structurées, llms.txt. Le référencement classique reste la fondation ; l'IA est le nouveau sommet.",
    "new": "J'ai commencé par faire monter des commerces québécois dans le pack local, puis j'ai vu arriver la vague des moteurs de réponse. Désormais je forme mes clients au GEO (être cité par ChatGPT, Perplexity et les AI Overviews de Google) avec des méthodes concrètes : structure citable, données structurées, llms.txt. Le référencement classique reste la fondation ; l'IA est le nouveau sommet."
  },
  {
    "slug": "fatou-ndiaye",
    "old": "Community manager devenue analyste, je mesure ce que les autres content de survoler : l'engagement authentique des communautés en ligne. De Dakar à Douala en passant par Paris, j'observe les mêmes erreurs — des marques qui confondent audience et influence. Mes tableaux de créateurs sont triés par engagement réel calculé sur les dix dernières publications, sans exception ni raccourci.",
    "new": "Community manager devenue analyste, je mesure ce que les autres content de survoler : l'engagement authentique des communautés en ligne. De Dakar à Douala en passant par Paris, j'observe les mêmes erreurs : des marques qui confondent audience et influence. Mes tableaux de créateurs sont triés par engagement réel calculé sur les dix dernières publications, sans exception ni raccourci."
  },
  {
    "slug": "serge-mbarga",
    "old": "Formé à l'ENSPY de Yaoundé puis aguerri sur des projets de digitalisation pour des groupes de la CEMAC, je structure aujourd'hui des bases de connaissances pour des chatbots d'entreprise. Mon terrain : transformer des documents hétérogènes — PDF, sites, procédures internes — en corpus Markdown que les modèles de langage digèrent sans halluciner. La rigueur technique camerounaise au service de l'IA francophone.",
    "new": "Formé à l'ENSPY de Yaoundé puis aguerri sur des projets de digitalisation pour des groupes de la CEMAC, je structure aujourd'hui des bases de connaissances pour des chatbots d'entreprise. Mon terrain : transformer des documents hétérogènes (PDF, sites, procédures internes) en corpus Markdown que les modèles de langage digèrent sans halluciner. La rigueur technique camerounaise au service de l'IA francophone."
  },
  {
    "slug": "nadia-elfassi",
    "old": "Casablancaise, j'ai organisé la participation de PME marocaines et françaises aux plus grands salons professionnels pendant six ans. De ce métier j'ai gardé un réseau et une science : celle de lire un annuaire d'exposants comme une carte aux trésors. Budgets marketing, signaux d'internationalisation, décideurs accessibles — je livre l'intelligence commerciale qui se cache derrière chaque stand.",
    "new": "Casablancaise, j'ai organisé la participation de PME marocaines et françaises aux plus grands salons professionnels pendant six ans. De ce métier j'ai gardé un réseau et une science : celle de lire un annuaire d'exposants comme une carte aux trésors. Budgets marketing, signaux d'internationalisation, décideurs accessibles : je livre l'intelligence commerciale qui se cache derrière chaque stand."
  },
  {
    "slug": "grace-adjoua",
    "old": "Docteure en pharmacie reconvertie dans l'intelligence de données santé-formation, je combine la rigueur scientifique et la fibre pédagogique. Mes annuaires d'organismes, mes cartographies d'aides et mes synthèses de littérature scientifique sont utilisés par des cabinets comme par des ONG. Ma signature : chaque donnée livrée porte sa source, sa date et son périmètre — la transparence avant tout.",
    "new": "Docteure en pharmacie reconvertie dans l'intelligence de données santé-formation, je combine la rigueur scientifique et la fibre pédagogique. Mes annuaires d'organismes, mes cartographies d'aides et mes synthèses de littérature scientifique sont utilisés par des cabinets comme par des ONG. Ma signature : chaque donnée livrée porte sa source, sa date et son périmètre ; la transparence avant tout."
  },
  {
    "slug": "ibrahim-sawadogo",
    "old": "Ouagalais, j'ai passé dix ans dans le fret et la distribution entre l'Europe et le Sahel avant de me spécialiser dans l'analyse de ces marchés. Je connais les circuits officiels comme les réalités du terrain, les zones franches comme les goulets d'étranglement. Mes comparatifs de réseaux et mes études de distribution donnent aux marques européennes une vision honnête de leur expansion africaine — et inversement.",
    "new": "Ouagalais, j'ai passé dix ans dans le fret et la distribution entre l'Europe et le Sahel avant de me spécialiser dans l'analyse de ces marchés. Je connais les circuits officiels comme les réalités du terrain, les zones franches comme les goulets d'étranglement. Mes comparatifs de réseaux et mes études de distribution donnent aux marques européennes une vision honnête de leur expansion africaine, et inversement."
  },
  {
    "slug": "salif-kone",
    "old": "Bamakois, économiste de formation, j'aide les particuliers comme les familles à prendre des décisions chiffrées — écoles, véhicules, travaux, établissements pour seniors. En Afrique comme en Europe, les mêmes pièges reviennent : décider sur des impressions plutôt que sur des comparaisons. Mes tableaux croisés remettent les chiffres au centre, avec une obsession : rester lisible pour des non-techniciens.",
    "new": "Bamakois, économiste de formation, j'aide les particuliers comme les familles à prendre des décisions chiffrées : écoles, véhicules, travaux, établissements pour seniors. En Afrique comme en Europe, les mêmes pièges reviennent : décider sur des impressions plutôt que sur des comparaisons. Mes tableaux croisés remettent les chiffres au centre, avec une obsession : rester lisible pour des non-techniciens."
  },
  {
    "slug": "mariam-conde",
    "old": "Conakryenne, consultante RH pour des organisations régionales, je cartographie l'emploi et les talents à travers la francophonie. J'ai construit des observatoires des métiers qui nourrissent autant les politiques publiques que les stratégies de recrutement privé. Ma spécialité : débusquer les signaux faibles — offres qui restent ouvertes, entreprises qui s'installent, talents qui circulent.",
    "new": "Conakryenne, consultante RH pour des organisations régionales, je cartographie l'emploi et les talents à travers la francophonie. J'ai construit des observatoires des métiers qui nourrissent autant les politiques publiques que les stratégies de recrutement privé. Ma spécialité est de débusquer les signaux faibles : offres qui restent ouvertes, entreprises qui s'installent, talents qui circulent."
  },
  {
    "slug": "didier-mpoku",
    "old": "Lubumbashois, développeur devenu analyste d'écosystème, je documente l'écosystème logiciel francophone comme un naturaliste documente une forêt : avec patience et méthode. Extensions, plugins, apps, avis utilisateurs, évolutions de prix — je nourris mes tableaux à partir de sources que personne n'a le temps de surveiller en continu. Les équipes produit que j'informe décident deux crans au-dessus.",
    "new": "Lubumbashois, développeur devenu analyste d'écosystème, je documente l'écosystème logiciel francophone comme un naturaliste documente une forêt : avec patience et méthode. Extensions, plugins, apps, avis utilisateurs, évolutions de prix : je nourris mes tableaux à partir de sources que personne n'a le temps de surveiller en continu. Les équipes produit que j'informe décident deux crans au-dessus."
  },
  {
    "slug": "amine-benali",
    "old": "Tunisois, référenceur technique depuis douze ans, j'ai suivi toutes les mutations de la recherche — des mappings aux AI Overviews. Mon obsession actuelle : la citabilité. Je structure les contenus pour que les moteurs génératifs les citent : réponses extraites, données chiffrées, balisage impeccable, llms.txt propre. Le SEO que je pratique est un artisanat de précision, à la tunisienne.",
    "new": "Tunisois, référenceur technique depuis douze ans, j'ai suivi toutes les mutations de la recherche, des mappings aux AI Overviews. Mon obsession actuelle : la citabilité. Je structure les contenus pour que les moteurs génératifs les citent : réponses extraites, données chiffrées, balisage impeccable, llms.txt propre. Le SEO que je pratique est un artisanat de précision, à la tunisienne."
  },
  {
    "slug": "fatou-ndiaye",
    "old": "Community manager devenue analyste, je mesure ce que les autres content de survoler : l'engagement authentique des communautés en ligne.",
    "new": "Community manager devenue analyste, je mesure ce que les autres se contentent de survoler : l'engagement authentique des communautés en ligne."
  }
];

async function main() {
  let patched = 0;
  let already = 0;
  for (const f of FIXES) {
    const s = await db.seller.findUnique({ where: { slug: f.slug }, select: { bio: true, title: true } });
    if (!s) continue;
    const data: Record<string, string> = {};
    if (s.bio === f.old) data.bio = f.new;
    else if (s.bio.includes(f.old)) data.bio = s.bio.replace(f.old, f.new);
    if (Object.keys(data).length > 0) {
      await db.seller.update({ where: { slug: f.slug }, data });
      patched++;
    } else {
      already++;
    }
  }
  console.log(`Bios vendeurs : ${patched} corrigées · ${already} déjà conformes.`);
}

main()
  .catch((e) => { console.error("✗ Échec :", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
