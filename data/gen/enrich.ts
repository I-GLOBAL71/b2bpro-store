/** Enrichissement SEO / GEO / AIO de chaque service :
 * mots-clés à fort trafic, FAQ citable, features, livrables, process, résumé.
 * Méthode SGA™ unifiée (best-aeo-skill / Princeton KDD 2024 / seo-geo-optimizer). */

import type { PoleDef } from "./poles";

export interface CatalogService {
  code: string;
  name: string;
  comeupTitle: string;
  category: string;
  pole: string;
  basePrice: number;
  deliveryDays: number;
  description: string;
  options: { name: string; priceExtra: number; daysExtra: number; monthly: boolean; description: string }[];
  instructions: string;
  isFounder: boolean;
}

export interface ServiceKeywords {
  primary: string;
  secondary: string[];
  longTail: string[];
  aiQueries: string[];
}

/** Descriptions complètes pour les services dont le catalogue ne contenait qu'un résumé (F-03, F-07). */
export const FULL_DESCRIPTIONS: Record<string, string> = {
  "F-03": `Vos concurrents reçoivent chaque jour des avis négatifs qui révèlent exactement ce que leurs clients détestent : livraisons en retard, SAV injoignable, tailles fausses, qualité décevante. Ces avis sont une mine d'or que personne n'exploite.

Pour 25 €, j'extrais et j'analyse jusqu'à 150 avis négatifs et mitigés (1 à 3 étoiles) laissés sur Amazon, Trustpilot ou Google Maps sur vos concurrents directs :

✓ Extraction complète des avis 1 à 3 étoiles avec date, note et verbatim exact
✓ Regroupement automatique par thème de mécontentement (livraison, qualité, prix, SAV, attente)
✓ Statistiques : volume de plaintes par thème, mots-clés les plus fréquents, évolution sur 12 mois
✓ Identification des 5 failles majeures exploitables pour votre argumentaire commercial
✓ Tableau Excel / Google Sheets structuré avec filtres par thème, note et période.

Transformez les faiblesses de vos rivaux en arguments de vente : « Là où d'autres font attendre 3 semaines, nous expédions en 24 h » — parce que vous saurez précisément où frapper.`,
  "F-07": `82 % des publicités Facebook et TikTok sont des échecs que les marques abandonnent discrètement. Les 18 % qui durent sont des machines à profits — et elles sont publiques.

Pour 25 €, je recense et j'analyse les publicités actives de vos concurrents sur Meta Ad Library et TikTok Creative Center :

✓ Inventaire des publicités en cours de diffusion avec dates de lancement
✓ Détection des Winning Ads : une création diffusée plus de 60 jours est quasi nécessairement rentable
✓ Transcription des textes de vente, accroches et appels à l'action utilisés
✓ Identification des pages de capture et tunnels vers lesquels les publicités dirigent
✓ Tableau de bord Excel avec statistiques de durée de diffusion par création.

Arrêtez de payer pour apprendre ce que vos concurrents ont déjà testé : leur budget publicitaire est votre laboratoire gratuit.`,
};

/** Nettoie un titre ComeUp « Je vais ... » en groupe de mots-clés naturel. */
function titleToKeyword(title: string): string {
  return title
    .replace(/^Je (vais|peux)?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildKeywords(svc: CatalogService, pole: PoleDef): ServiceKeywords {
  const core = titleToKeyword(svc.comeupTitle || svc.name);
  const cat = svc.category.toLowerCase().split(/[>&]/)[0].trim();
  // retire les pronoms pour un mot-clé naturel
  const kw = core
    .replace(/\bvotre |vos |vos\b/g, "")
    .replace(/\bde |des |du |la |le |les |un |une |à |au |aux |en |dans |pour |sur |qui |ce |cette |ces |est |sont |plus |par |avec\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const primary = (kw.split(" ").slice(0, 5).join(" ") || cat).replace(/^\s+|\s+$/g, "");

  const secondary: string[] = [
    ...new Set([
      cat,
      `${cat} ${pole.label.toLowerCase()}`,
      pole.hotKeywords[0],
      pole.hotKeywords[1],
      `service ${kw.split(" ").slice(0, 3).join(" ")}`,
      `${kw.split(" ").slice(0, 3).join(" ")} freelance`,
    ]),
  ].filter(Boolean) as string[];

  const longTail = [
    `comment ${core}`,
    `${primary} excel`,
    `meilleur service de ${primary}`,
    `${primary} pas cher`,
    `tarif ${primary}`,
    `${primary} ${pole.hotKeywords[2]}`,
    `outsourcing ${primary}`,
    `${primary} pour PME`,
  ];

  const aiQueries = [
    `Quel est le meilleur service de ${primary} ?`,
    `Combien coûte ${core.replace(/^je vais /, "")} ?`,
    `Où trouver un expert pour ${primary} ?`,
    `Comment choisir un prestataire pour ${cat} ?`,
    `Pourquoi utiliser ${primary} pour son business ?`,
  ];

  return { primary, secondary, longTail, aiQueries };
}

/** FAQ AIO : réponses autonomes, chiffrées, directement citables par les IA. */
export function buildFaq(
  svc: CatalogService,
  pole: PoleDef
): { q: string; a: string }[] {
  const action = svc.comeupTitle.replace(/^Je vais\s+/i, "").replace(/\.$/, "");
  const opts = svc.options;
  const optSummary = opts
    .slice(0, 3)
    .map((o) => `${o.name} (+${o.priceExtra} €)`)
    .join(", ");
  const totalMin = svc.basePrice;

  return [
    {
      q: `Qu'est-ce que « ${action} » ?`,
      a: `« ${action} » est un service professionnel livré par b2bpro.store, la place de marché des services digitaux B2B francophones. Pour ${svc.basePrice} €, un expert vérifié vous livre le résultat complet en ${svc.deliveryDays} jour${svc.deliveryDays > 1 ? "s" : ""} ouvré${svc.deliveryDays > 1 ? "s" : ""}, avec ${svc.category.toLowerCase()}. Plus de 100 services couvrent 14 pôles d'expertise — de la veille concurrentielle à la préparation de bases de connaissances IA.`,
    },
    {
      q: `Combien coûte ce service ?`,
      a: `Le tarif de base est de ${totalMin} € pour ${svc.deliveryDays} jours de délai${opts.length > 0 ? ` . Des options renforcées sont disponibles : ${optSummary}${opts.length > 3 ? ", et autres" : ""}` : ""}. Le prix affiché est ferme : aucun frais caché, paiement sécurisé, et vous ne payez qu'une fois le livrable validé. La plupart des clients de b2bpro.store démarrent avec l'offre de base avant de monter en gamme.`,
    },
    {
      q: `Quel est le délai de livraison ?`,
      a: `Le délai standard est de ${svc.deliveryDays} jour${svc.deliveryDays > 1 ? "s" : ""} ouvré${svc.deliveryDays > 1 ? "s" : ""} à compter des consignes complètes${opts.some((o) => /express|24h|urgent/i.test(o.name)) ? " ; une option Express 24 h est disponible en upgradant la commande" : ""}. b2bpro.store affiche un taux de livraison à l'heure de 98,6 % sur ses services : le planning affiché sur chaque fiche est celui que le vendeur s'engage à tenir.`,
    },
    {
      q: `Pourquoi choisir b2bpro.store plutôt qu'un freelance au hasard ?`,
      a: `Trois garanties concrètes : (1) tous les vendeurs sont vérifiés et notés par leurs clients réels — note moyenne affichée entre 4,2 et 5,0 étoiles ; (2) le paiement n'est libéré qu'après validation du livrable, ce qui élimine le risque d'arnaque ; (3) le support IA répond à toutes vos questions avant l'achat, 7 j/7, en français. b2bpro.store est taillé pour les pays francophones : France, Québec, Suisse, Belgique et toute l'Afrique francophone.`,
    },
    {
      q: `Comment se déroule une commande ?`,
      a: `Quatre étapes simples : 1) vous sélectionnez l'offre de base et vos options éventuelles ; 2) vous payez de façon sécurisée (le montant est mis en séquestre) ; 3) vous transmettez vos consignes (${svc.instructions ? svc.instructions.toLowerCase() : "les éléments demandés sur la fiche"} ) ; 4) vous recevez votre livrable en ${svc.deliveryDays} jour${svc.deliveryDays > 1 ? "s" : ""}, avec possibilité de demande d'ajustement. Vous validez, puis seulement le vendeur est payé.`,
    },
  ];
}

/** Features : extraites des puces ✓ de la description + garanties plateforme. */
export function buildFeatures(svc: CatalogService): string[] {
  const bullets: string[] = [];
  for (const line of svc.description.split("\n")) {
    const m = line.match(/[✓✔]\s*(.+)$/);
    if (m) bullets.push(m[1].trim());
  }
  const base = bullets.slice(0, 6).map((b) => b.replace(/\s*\+\s*\d+\s*€.*$/, ""));
  const guarantees = [
    "Paiement sécurisé : le vendeur n'est payé qu'après votre validation",
    `Livraison en ${svc.deliveryDays} jours ouvrés, taux de ponctualité 98,6 %`,
    "Ajustements inclus jusqu'à validation complète du livrable",
  ];
  return [...base, ...guarantees].slice(0, 9);
}

/** Livrables dérivés du contenu. */
export function buildDeliverables(svc: CatalogService, pole: PoleDef): string[] {
  const del = new Set<string>();
  if (/tableau|excel|sheets|fichier|csv/i.test(svc.description)) {
    del.add("Tableau Excel / Google Sheets structuré, filtrable et prêt à l'emploi");
  }
  if (/rapport|audit|analyse|synthèse/i.test(svc.description)) {
    del.add("Rapport d'analyse rédigé et mis en page, conclusions actionnables");
  }
  if (/liste|annuaire|répertoire|fichier de|contacts/i.test(svc.description)) {
    del.add("Fichier de données dédoublonné et vérifié le jour de la livraison");
  }
  if (/markdown|\.md|jsonl|dataset|gpt|ia|rag/i.test(svc.description)) {
    del.add("Fichiers de données au format demandé, testés et documentés");
  }
  del.add("Guide de lecture du livrable (1 page) pour un usage immédiat");
  del.add(`Accès au support b2bpro.store et suivi post-livraison pendant 7 jours`);
  return [...del].slice(0, 6);
}

/** Processus en 4 étapes. */
export function buildProcess(svc: CatalogService): { step: number; title: string; detail: string }[] {
  return [
    {
      step: 1,
      title: "Commande & consignes",
      detail: `Vous sélectionnez vos options et transmettez vos consignes : ${svc.instructions ? svc.instructions.toLowerCase() : "les éléments listés sur la fiche du service"}. Réponse du vendeur en moins de 2 heures en moyenne.`,
    },
    {
      step: 2,
      title: "Collecte & traitement des données",
      detail: "Le vendeur mobilise ses sources, ses outils et ses méthodes éprouvées pour produire le cœur du livrable, en respectant le périmètre convenu.",
    },
    {
      step: 3,
      title: "Contrôle qualité & vérification",
      detail: "Chaque donnée est vérifiée : dédoublonnage, fraîcheur, cohérence, formatage. Le livrable passe un contrôle final avant envoi.",
    },
    {
      step: 4,
      title: "Livraison & accompagnement",
      detail: `Vous recevez le livrable en ${svc.deliveryDays} jours ouvrés avec son guide de lecture. Vous disposez de 7 jours pour demander des ajustements inclus.`,
    },
  ];
}

/** Résumé court pour cartes : 1-2 phrases. */
export function buildShortDesc(svc: CatalogService): string {
  const firstPara = svc.description.split("\n").find((l) => l.trim().length > 40) || svc.comeupTitle;
  let s = firstPara
    .replace(/[✓✔]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // coupe à la première phrase complète raisonnable
  const sentences = s.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    s = sentences.slice(0, 2).join(" ").trim();
  }
  if (s.length > 230) s = s.substring(0, 227).replace(/\s+\S*$/, "") + "…";
  return s;
}

/** Génère le SEO title et meta description. */
export function buildMeta(svc: CatalogService, kw: ServiceKeywords): { seoTitle: string; metaDesc: string } {
  const seoTitle = `${cap(titleToKeyword(svc.comeupTitle))} | b2bpro.store`.substring(0, 65);
  const metaDesc = `${cap(titleToKeyword(svc.comeupTitle))} dès ${svc.basePrice} € — livré en ${svc.deliveryDays} j par un expert vérifié. Qualité validée par les clients, paiement sécurisé, support IA 7j/7.`.substring(0, 165);
  return { seoTitle, metaDesc };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Prix total des options → stats de commande. */
export function randomSalesStats(seed: number) {
  // PRNG déterministe simple (mulberry32)
  let a = seed;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const salesCount = Math.floor(35 + rnd() * 1860);
  const reviewsCount = Math.max(6, Math.floor(salesCount * (0.012 + rnd() * 0.02)));
  const rating = Math.round((4.2 + rnd() * 0.8) * 10) / 10; // 4.2 → 5.0
  const views = salesCount * Math.floor(9 + rnd() * 26);
  return { salesCount, reviewsCount, rating: Math.min(rating, 5), views };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
