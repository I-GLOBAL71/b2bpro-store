/** Pôles canoniques b2bpro.store : slugs, icônes, palettes, pools de mots-clés à fort trafic. */

export interface PoleDef {
  slug: string;
  label: string; // libellé court
  fullLabel: string; // libellé complet
  icon: string; // icône Lucide
  hue: [string, string]; // couleurs gradient [from, to]
  accent: string; // couleur accent
  description: string;
  hotKeywords: string[]; // mots-clés à fort trafic web (FR)
}

export const POLES: PoleDef[] = [
  {
    slug: "b2b-sales-intelligence",
    label: "B2B Sales Intelligence",
    fullLabel: "B2B Sales Intelligence & Intent Data",
    icon: "target",
    hue: ["#059669", "#10b981"],
    accent: "#059669",
    description:
      "Détection des entreprises qui recrutent, lèvent des fonds ou viennent d'être créées : captez les signaux d'intention B2B les plus chauds du marché.",
    hotKeywords: [
      "génération de leads B2B",
      "fichier de prospection B2B",
      "base de données entreprises françaises",
      "prospection commerciale",
      "entreprises qui recrutent",
      "startups ayant levé des fonds",
      "nouvelles entreprises créées INSEE",
      "intent data B2B",
      "liste dirigeants entreprises",
      "détection entreprises",
    ],
  },
  {
    slug: "ecommerce-pricing",
    label: "E-commerce & Pricing",
    fullLabel: "E-commerce, Retail & Pricing Intelligence",
    icon: "shopping-cart",
    hue: ["#d97706", "#f59e0b"],
    accent: "#d97706",
    description:
      "Surveillance des prix, stocks, Buy Box Amazon et promotions concurrentes : prenez les bonnes décisions marchandes au bon moment.",
    hotKeywords: [
      "veille concurrentielle prix",
      "surveillance prix concurrents",
      "rupture de stock concurrent",
      "buy box amazon",
      "benchmark prix e-commerce",
      "comparateur prix grossistes",
      "codes promo concurrents",
      "audit fiches produits SEO",
      "catalogue shopify migration",
      "veille e-commerce",
    ],
  },
  {
    slug: "ia-rag-data",
    label: "IA, RAG & Data",
    fullLabel: "IA, RAG & LLM Data Engineering",
    icon: "bot",
    hue: ["#7c3aed", "#a78bfa"],
    accent: "#7c3aed",
    description:
      "Bases de connaissances propres pour Custom GPT et chatbots, datasets FAQ, glossaires métier : donnez à vos IA des données exploitables.",
    hotKeywords: [
      "base de connaissances IA",
      "RAG data preparation",
      "custom GPT données",
      "chatbot entreprise",
      "convertir site en markdown",
      "dataset FAQ JSONL",
      "entraîner une IA",
      "hallucinations chatbot",
      "glossaire métier IA",
      "préparation données LLM",
    ],
  },
  {
    slug: "immobilier-local",
    label: "Immobilier & Local",
    fullLabel: "Immobilier, Travaux & Commerce Local",
    icon: "building-2",
    hue: ["#0d9488", "#14b8a6"],
    accent: "#0d9488",
    description:
      "Détection des annonces décotées, rentabilité locative, artisans RGE, permis de construire : l'intelligence data appliquée au local.",
    hotKeywords: [
      "annonces immobilières baisse de prix",
      "biens sous le prix du marché",
      "rentabilité locative calcul",
      "artisans certifiés RGE",
      "permis de construire mairie",
      "agences immobilières indépendantes",
      "fiche google maps optimisation",
      "commerces sans site web",
      "investissement locatif data",
      "SEO local",
    ],
  },
  {
    slug: "social-media-influence",
    label: "Social Media & Influence",
    fullLabel: "Social Media, Influence & Créateurs",
    icon: "megaphone",
    hue: ["#db2777", "#f472b6"],
    accent: "#db2777",
    description:
      "Micro-influenceurs à vrai taux d'engagement, formats viraux, publicités concurrentes décryptées : construisez des campagnes qui convertissent.",
    hotKeywords: [
      "micro influenceurs",
      "taux d'engagement influenceur",
      "créateurs tiktok engageants",
      "publicités facebook concurrents",
      "meta ad library analyse",
      "formats viraux tiktok",
      "posts linkedin engageants",
      "partenariats influenceurs #ad",
      "email instagram bio",
      "influence marketing B2B",
    ],
  },
  {
    slug: "rh-recrutement",
    label: "RH & Recrutement",
    fullLabel: "Recrutement, RH & Chasse de Têtes",
    icon: "users",
    hue: ["#0891b2", "#22d3ee"],
    accent: "#0891b2",
    description:
      "Offres non pourvues, grilles salariales, benchmarks avantages employeurs : les données RH qui font gagner du temps aux recruteurs.",
    hotKeywords: [
      "offres d'emploi non pourvues",
      "grille salariale métier",
      "benchmark avantages employeurs",
      "cartographie freelances",
      "TJM freelance",
      "recrutement data driven",
      "nouvelle antenne entreprise",
      "cabinet de recrutement",
      "chasse de tête",
      "war for talent",
    ],
  },
  {
    slug: "evenementiel-marches-publics",
    label: "Événementiel & Marchés Publics",
    fullLabel: "Événementiel, Salons & Marchés Publics",
    icon: "calendar-days",
    hue: ["#4f46e5", "#818cf8"],
    accent: "#4f46e5",
    description:
      "Veille BOAMP, annuaires d'exposants de salons pro, décisions d'attribution : ne ratez plus aucun contrat ni opportunité B2B.",
    hotKeywords: [
      "appels d'offres publics",
      "marchés publics BOAMP",
      "veille appels d'offres",
      "exposants salon professionnel",
      "annuaire exposants salon",
      "DCE dossier consultation",
      "décisions d'attribution marchés",
      "TED appels d'offres européens",
      "salons professionnels France",
      "marchés publics PME",
    ],
  },
  {
    slug: "grand-public",
    label: "Grand Public & Quotidien",
    fullLabel: "Grand Public : Auto, Logement, Travaux & Quotidien",
    icon: "heart-handshake",
    hue: ["#ea580c", "#fb923c"],
    accent: "#ea580c",
    description:
      "Voitures sous la cote, appartements entre particuliers, comparateurs travaux et EHPAD : les meilleures données pour vos décisions de vie.",
    hotKeywords: [
      "voiture occasion sous la cote",
      "appartement entre particulier",
      "comparateur prix travaux",
      "comparateur EHPAD",
      "cote collection montres",
      "école quartier comparatif",
      "offre emploi cachée",
      "séjour hôtel sans frais cachés",
      "argus data",
      "meilleur quartier investir",
    ],
  },
  {
    slug: "hotellerie-tourisme",
    label: "Hôtellerie & Tourisme",
    fullLabel: "Hôtellerie, Restauration, Tourisme & Loisirs",
    icon: "utensils-crossed",
    hue: ["#be123c", "#fb7185"],
    accent: "#be123c",
    description:
      "Veille tarifaire Airbnb, benchmark menus Uber Eats, avis touristiques multilingues : pilotez votre établissement avec des données fraîches.",
    hotKeywords: [
      "veille tarifaire airbnb",
      "benchmark menus uber eats",
      "avis touristiques traduction",
      "comités d'entreprise CSE",
      "domaines de mariage",
      "calendrier événements local",
      "producteurs locaux circuits courts",
      "revenu locatif saisonnier",
      "hôtellerie données",
      "restaurant digitalisation",
    ],
  },
  {
    slug: "grandes-entreprises",
    label: "Grandes Entreprises & Finance",
    fullLabel: "Grandes Entreprises, ETI, Finance & Supply Chain",
    icon: "briefcase",
    hue: ["#334155", "#64748b"],
    accent: "#334155",
    description:
      "Santé financière fournisseurs, sourcing fabricants européens, conformité RGPD, RSE : l'intelligence décisionnelle des grands comptes.",
    hotKeywords: [
      "santé financière fournisseur",
      "sourcing fabricants europe",
      "marque employeur audit",
      "dépôts de marques INPI",
      "conformité RGPD audit",
      "benchmark RSE ESG",
      "prix conseillés revendeurs MAP",
      "supply chain données",
      "veille brevets concurrents",
      "supply chain transparency",
    ],
  },
  {
    slug: "saas-tech",
    label: "SaaS & Tech",
    fullLabel: "SaaS, Tech, Logiciels & Produits Digitaux",
    icon: "cpu",
    hue: ["#2563eb", "#60a5fa"],
    accent: "#2563eb",
    description:
      "Avis G2 et Capterra décryptés, grilles tarifaires concurrentes, veille Product Hunt et changelogs : gagnez la bataille produit.",
    hotKeywords: [
      "avis logiciels G2 Capterra",
      "grille tarifaire SaaS",
      "veille product hunt",
      "bugs application mobile",
      "extensions chrome répertoire",
      "plugins wordpress marché",
      "apps shopify compétition",
      "fonds d'investissement VC",
      "business angels liste",
      "changelog concurrent",
    ],
  },
  {
    slug: "seo-geo-medias",
    label: "SEO, GEO & Médias",
    fullLabel: "SEO, GEO (IA Search), Médias, RP & Podcasts",
    icon: "trending-up",
    hue: ["#16a34a", "#4ade80"],
    accent: "#16a34a",
    description:
      "Audit de visibilité dans les IA, sitemaps concurrents, People Also Ask, podcasts et fichiers presse : soyez cité là où ça compte.",
    hotKeywords: [
      "GEO generative engine optimization",
      "audit visibilité IA chatgpt",
      "référencement ChatGPT Perplexity",
      "people also ask extraction",
      "sitemap concurrent SEO",
      "liens cassés netlinking",
      "podcasts invités actifs",
      "fichier presse journalistes",
      "e-réputation reddit forums",
      "citation IA réponse",
    ],
  },
  {
    slug: "formation-sante",
    label: "Formation & Santé",
    fullLabel: "Subventions, Associations, Formation & Santé",
    icon: "graduation-cap",
    hue: ["#9333ea", "#c084fc"],
    accent: "#9333ea",
    description:
      "Aides publiques, organismes Qualiopi, formations CPF, recherches PubMed : captez les opportunités des secteurs formation et santé.",
    hotKeywords: [
      "aides publiques subventions",
      "organismes formation Qualiopi",
      "formations CPF benchmark",
      "recherches scientifiques PubMed",
      "annuaire pharmaceutique",
      "cours en ligne rentables",
      "annuaire mairies collectivités",
      "associations sportives liste",
      "financement formation",
      "santé données",
    ],
  },
  {
    slug: "logistique-franchises",
    label: "Logistique & Franchises",
    fullLabel: "Logistique, Import-Export, Franchise & Énergie",
    icon: "truck",
    hue: ["#78716c", "#a8a29e"],
    accent: "#78716c",
    description:
      "Réseaux de franchises, bornes IRVE, rappels produits, marques étrangères non distribuées : dénichez les opportunités invisibles.",
    hotKeywords: [
      "réseaux de franchises comparatif",
      "bornes recharge IRVE",
      "rappel produit RappelConso",
      "marques étrangères distribution",
      "ventes aux enchères judiciaires",
      "franchise secteur",
      "import export opportunités",
      "audit 360 visibilité digitale",
      "liquidations judiciaires",
      "zone blanche recharge",
    ],
  },
];

/** Map des libellés parsés du catalogue → pôle canonique. */
export function resolvePole(poleLabel: string): PoleDef {
  const norm = poleLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // sans accents
  if (norm.includes("b2b")) return POLES[0];
  if (norm.includes("e-commerce") || norm.includes("pricing") || norm.includes("retail")) return POLES[1];
  if (norm.includes("seo") || norm.includes("geo") || norm.includes("podcast")) return POLES[11];
  if (norm.includes("social")) return POLES[4];
  if (norm.includes("rag") || norm.includes("llm") || norm.includes("data engine") || /\bia\b/.test(norm)) return POLES[2];
  if (norm.includes("immobilier")) return POLES[3];
  if (norm.includes("rh") || norm.includes("recrutement")) return POLES[5];
  if (norm.includes("evenementiel") || norm.includes("marches publics")) return POLES[6];
  if (norm.includes("grand public")) return POLES[7];
  if (norm.includes("hotellerie")) return POLES[8];
  if (norm.includes("grandes entreprises")) return POLES[9];
  if (norm.includes("saas")) return POLES[10];
  if (norm.includes("formation") || norm.includes("sante") || norm.includes("subventions")) return POLES[12];
  if (norm.includes("logistique") || norm.includes("franchise")) return POLES[13];
  return POLES[0];
}
