# Soumission Google Search Console — les 113 fiches service individuellement

> **Objet :** procédure de soumission robuste de b2bpro.store à GSC, avec la liste
> exhaustive des URLs directes des 113 fiches service (une URL = une page
> individuelle indexable, déjà présente individuellement dans `sitemap.xml`).

---

## 1. Vérification de propriété — méthode « Fichier HTML » (déjà déployée)

Le fichier de vérification `googlec5dc6c64480779bb.html` est **committé à la racine
`public/`** et donc servi sur chaque déploiement :

- `https://b2bpro.store/googlec5dc6c64480779bb.html` (une fois le domaine branché) ;
- `https://b2bpro-store.vercel.app/googlec5dc6c64480779bb.html` (dès maintenant).

Réponse attendue : **HTTP 200**, contenu `google-site-verification: googlec5dc6c64480779bb.html`.
`robots.txt` ne contient aucune règle `Disallow` : le fichier est librement récupérable.

**Étapes GSC** : *Ajouter une propriété* → **Préfixe URL** `https://b2bpro.store` →
*Autres méthodes de vérification* → **Fichier HTML** → (le fichier est déjà en ligne) →
cliquer **« Vérifier »**.

> ⚠️ La vérification ne peut aboutir **que lorsque le domaine `b2bpro.store` est
> branché sur Vercel** (barre latérale → Domains + DNS registrar, runbook §2.3) :
> Google doit pouvoir interroger `https://b2bpro.store/google…html`. En attendant,
> le même fichier vérifie la propriété `https://b2bpro-store.vercel.app` à tout moment.
> Alternative sans fichier : la balise META (`GOOGLE_SITE_VERIFICATION`, runbook §6.3).

## 2. Soumission groupée — le sitemap (les 113 fiches d'un coup)

GSC → **Sitemaps** → saisir `sitemap.xml` → **Envoyer**. Le sitemap liste **176 URLs**
dont **chaque fiche service individuellement** (`/services/<slug>`, priorité 0.9,
`lastmod` = date de création réelle) + 14 pages de pôle, blog, vendeurs, pages clés.
C'est le mécanisme officiel de soumission en masse : chaque service y figure
**individuellement** avec sa propre URL.

## 3. Soumission individuelle — Inspection d'URL (fiche par fiche)

Pour accélérer la découverte des pages prioritaires : GSC → barre **« Inspection
d'URL »** (en haut) → coller l'URL complète → **« Tester la diffusion »** →
**« Demander l'indexation »** (quota journalier par propriété, ~10-12 demandes/jour
recommandées). Ordre conseillé : best-sellers d'abord (colonne ventes ci-dessous),
puis 2-3 fiches par pôle, puis le reste sur plusieurs jours.

---

## 4. Les 113 URLs directes des fiches service

Classées par volume de ventes décroissant dans chaque pôle. Format prêt à coller
dans l'inspection d'URL GSC.


### B2B Sales Intelligence — 13 services

- https://b2bpro.store/services/je-vais-surveiller-les-nominations-de-nouveaux-dirigeants-dans-votre-c — Je vais surveiller les nominations de nouveaux dirigeants dans votre cible (★4.4, 55 avis, 1813 ventes)
- https://b2bpro.store/services/je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci — Je vais lister les startups et PME ayant levé des fonds ce mois-ci (★4.5, 48 avis, 1637 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-marques-vendant-sur-amazon-dans-votre-niche — Je vais répertorier les marques vendant sur Amazon dans votre niche (★4.3, 39 avis, 1375 ventes)
- https://b2bpro.store/services/je-vais-nettoyer-dedoublonner-et-formater-votre-base-de-contacts-clien — Je vais nettoyer, dédoublonner et formater votre base de contacts clients (★4.8, 36 avis, 1285 ventes)
- https://b2bpro.store/services/je-vais-constituer-votre-annuaire-de-professionnels-de-sante-par-ville — Je vais constituer votre annuaire de professionnels de santé par ville (★4.3, 33 avis, 1163 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-organismes-de-formation-avec-statuts-qualiopi — Je vais répertorier les organismes de formation avec statuts Qualiopi (★4.7, 28 avis, 1059 ventes)
- https://b2bpro.store/services/je-vais-lister-les-commerces-locaux-ayant-une-note-inferieure-a-3-8 — Je vais lister les commerces locaux ayant une note inférieure à 3.8 (★4.2, 31 avis, 995 ventes)
- https://b2bpro.store/services/je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur — Je vais identifier les entreprises qui recrutent dans votre secteur (★4.4, 17 avis, 839 ventes)
- https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie — Je vais vous fournir un fichier de prospection B2B frais et vérifié (★4.8, 21 avis, 832 ventes)
- https://b2bpro.store/services/je-vais-lister-les-sites-web-utilisant-une-technologie-ou-cms-precis — Je vais lister les sites web utilisant une technologie ou CMS précis (★4.4, 21 avis, 756 ventes)
- https://b2bpro.store/services/je-vais-identifier-les-nouvelles-entreprises-creees-dans-votre-secteur — Je vais identifier les nouvelles entreprises créées dans votre secteur (★4.5, 6 avis, 426 ventes)
- https://b2bpro.store/services/je-vais-espionner-les-avis-negatifs-de-vos-concurrents-pour-les-battre — Je vais espionner les avis négatifs de vos concurrents pour les battre (★4.7, 7 avis, 143 ventes)
- https://b2bpro.store/services/je-vais-cartographier-les-freelances-experts-de-votre-specialite-tech — Je vais cartographier les freelances experts de votre spécialité tech (★4.8, 6 avis, 48 ventes)

### E-commerce & Pricing — 11 services

- https://b2bpro.store/services/je-vais-formater-votre-catalogue-produits-pour-migrer-vers-shopify — Je vais formater votre catalogue produits pour migrer vers Shopify (★4.6, 33 avis, 1894 ventes)
- https://b2bpro.store/services/je-vais-auditer-le-referencement-et-les-balises-des-produits-rivaux — Je vais auditer le référencement et les balises des produits rivaux (★4.7, 35 avis, 1617 ventes)
- https://b2bpro.store/services/je-vais-compiler-les-guides-des-tailles-et-fiches-techniques-marche — Je vais compiler les guides des tailles et fiches techniques marché (★4.4, 36 avis, 1607 ventes)
- https://b2bpro.store/services/je-vais-cartographier-les-tarifs-et-delais-de-livraison-concurrents — Je vais cartographier les tarifs et délais de livraison concurrents (★4.3, 24 avis, 1590 ventes)
- https://b2bpro.store/services/je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents — Je vais détecter les produits en rupture de stock chez vos concurrents (★4.2, 34 avis, 1224 ventes)
- https://b2bpro.store/services/je-vais-auditer-les-offres-promotionnelles-et-codes-promo-rivaux — Je vais auditer les offres promotionnelles et codes promo rivaux (★4.6, 16 avis, 1205 ventes)
- https://b2bpro.store/services/je-vais-surveiller-les-variations-de-la-buy-box-sur-vos-produits-amazo — Je vais surveiller les variations de la Buy Box sur vos produits Amazon (★4.9, 24 avis, 1153 ventes)
- https://b2bpro.store/services/je-vais-surveiller-en-direct-les-prix-et-stocks-de-vos-concurrents — Je vais surveiller en direct les prix et stocks de vos concurrents (★4.6, 18 avis, 775 ventes)
- https://b2bpro.store/services/je-vais-comparer-automatiquement-les-tarifs-de-vos-3-grossistes-cles — Je vais comparer automatiquement les tarifs de vos 3 grossistes clés (★4.6, 6 avis, 174 ventes)
- https://b2bpro.store/services/je-vais-extraire-les-questions-clients-sur-les-fiches-de-vos-rivaux — Je vais extraire les questions clients sur les fiches de vos rivaux (★4.6, 6 avis, 146 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-nouveautes-et-best-sellers-d-un-site-rival — Je vais répertorier les nouveautés et best-sellers d'un site rival (★4.8, 6 avis, 104 ventes)

### Social Media & Influence — 9 services

- https://b2bpro.store/services/je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche — Je vais analyser les 50 vidéos YouTube les plus vues de votre niche (★4.7, 38 avis, 1861 ventes)
- https://b2bpro.store/services/je-vais-cartographier-l-organigramme-public-des-equipes-concurrentes — Je vais cartographier l'organigramme public des équipes concurrentes (★4.8, 27 avis, 1516 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-posts-linkedin-les-plus-engageants-du-secteur — Je vais analyser les posts LinkedIn les plus engageants du secteur (★4.5, 25 avis, 1474 ventes)
- https://b2bpro.store/services/je-vais-identifier-avec-quels-influenceurs-vos-rivaux-collaborent — Je vais identifier avec quels influenceurs vos rivaux collaborent (★4.7, 22 avis, 1453 ventes)
- https://b2bpro.store/services/je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement — Je vais lister des micro-influenceurs avec vrai taux d'engagement (★4.4, 19 avis, 1191 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-formats-et-sons-viraux-de-la-semaine-en-video — Je vais répertorier les formats et sons viraux de la semaine en vidéo (★4.3, 12 avis, 711 ventes)
- https://b2bpro.store/services/je-vais-compiler-des-profils-instagram-avec-email-pro-public-en-bio — Je vais compiler des profils Instagram avec email pro public en bio (★4.4, 6 avis, 305 ventes)
- https://b2bpro.store/services/je-vais-trouver-les-createurs-tiktok-emergents-dans-votre-thematique — Je vais trouver les créateurs TikTok émergents dans votre thématique (★4.7, 6 avis, 235 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-publicites-facebook-et-tiktok-de-vos-concurrents — Je vais analyser les publicités Facebook et TikTok de vos concurrents (★4.7, 6 avis, 207 ventes)

### SEO, GEO & Médias — 9 services

- https://b2bpro.store/services/je-vais-trouver-des-opportunites-de-liens-casses-pour-votre-seo — Je vais trouver des opportunités de liens cassés pour votre SEO (★4.3, 52 avis, 1876 ventes)
- https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia — Je vais auditer si votre marque est recommandée par les moteurs IA (★4.7, 49 avis, 1765 ventes)
- https://b2bpro.store/services/je-vais-constituer-votre-liste-de-medias-et-journalistes-specialises — Je vais constituer votre liste de médias et journalistes spécialisés (★4.6, 35 avis, 1368 ventes)
- https://b2bpro.store/services/je-vais-lister-50-podcasts-de-votre-thematique-qui-invitent-des-pros — Je vais lister 50 podcasts de votre thématique qui invitent des pros (★4.6, 29 avis, 1178 ventes)
- https://b2bpro.store/services/je-vais-extraire-300-vraies-questions-posees-sur-google-dans-sa-niche — Je vais extraire 300 vraies questions posées sur Google dans sa niche (★4.8, 18 avis, 859 ventes)
- https://b2bpro.store/services/je-vais-auditer-le-top-20-de-vos-concurrents-sur-google-maps-local — Je vais auditer le top 20 de vos concurrents sur Google Maps local (★4.4, 20 avis, 652 ventes)
- https://b2bpro.store/services/je-vais-recenser-toutes-les-discussions-sur-votre-marque-sur-forums — Je vais recenser toutes les discussions sur votre marque sur forums (★4.9, 16 avis, 533 ventes)
- https://b2bpro.store/services/je-vais-extraire-tous-les-sujets-d-articles-publies-par-vos-rivaux — Je vais extraire tous les sujets d'articles publiés par vos rivaux (★4.9, 7 avis, 272 ventes)
- https://b2bpro.store/services/je-vais-rediger-votre-article-de-blog-ultra-optimise-seo-geo-et-aio — Je vais rédiger votre article de blog ultra-optimisé SEO, GEO et AIO (★4.8, 9 avis, 41 ventes)

### Immobilier & Local — 9 services

- https://b2bpro.store/services/je-vais-repertorier-les-conciergeries-et-hebergements-de-votre-zone — Je vais répertorier les conciergeries et hébergements de votre zone (★4.7, 32 avis, 1608 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-commerces-de-votre-ville-sans-site-web-actif — Je vais répertorier les commerces de votre ville sans site web actif (★4.3, 22 avis, 1424 ventes)
- https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-en-baisse-dans-votre-zone — Je vais détecter les annonces immobilières en baisse dans votre zone (★4.3, 22 avis, 1406 ventes)
- https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche — Je vais détecter les annonces immobilières sous le prix du marché (★4.7, 32 avis, 1147 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-permis-de-construire-et-declarations-travaux — Je vais répertorier les permis de construire et déclarations travaux (★4.9, 27 avis, 1054 ventes)
- https://b2bpro.store/services/je-vais-analyser-la-rentabilite-brute-de-100-biens-dans-votre-ville — Je vais analyser la rentabilité brute de 100 biens dans votre ville (★4.8, 24 avis, 964 ventes)
- https://b2bpro.store/services/je-vais-vous-fournir-la-liste-officielle-des-artisans-certifies-rge — Je vais vous fournir la liste officielle des artisans certifiés RGE (★4.4, 18 avis, 770 ventes)
- https://b2bpro.store/services/je-vais-lister-les-agences-immobilieres-independantes-de-votre-zone — Je vais lister les agences immobilières indépendantes de votre zone (★4.4, 9 avis, 616 ventes)
- https://b2bpro.store/services/je-vais-auditer-les-attributs-manquants-des-fiches-google-rivales — Je vais auditer les attributs manquants des fiches Google rivales (★4.4, 6 avis, 481 ventes)

### IA, RAG & Data — 9 services

- https://b2bpro.store/services/je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia — Je vais convertir n'importe quel site en base de connaissances IA (★4.6, 20 avis, 1294 ventes)
- https://b2bpro.store/services/je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses — Je vais transformer votre contenu en jeu de données Questions Réponses (★4.5, 14 avis, 1044 ventes)
- https://b2bpro.store/services/je-vais-convertir-les-videos-youtube-de-votre-niche-en-fiches-ecrites — Je vais convertir les vidéos YouTube de votre niche en fiches écrites (★4.8, 25 avis, 865 ventes)
- https://b2bpro.store/services/je-vais-convertir-n-importe-quel-site-web-en-markdown-propre-pour-ia — Je vais convertir n'importe quel site web en Markdown propre pour IA (★4.8, 17 avis, 730 ventes)
- https://b2bpro.store/services/je-vais-creer-votre-glossaire-metier-exhaustif-pour-alimenter-une-ia — Je vais créer votre glossaire métier exhaustif pour alimenter une IA (★4.5, 13 avis, 516 ventes)
- https://b2bpro.store/services/je-vais-auditer-tous-les-articles-de-votre-blog-liens-morts-et-dates — Je vais auditer tous les articles de votre blog liens morts et dates (★4.5, 6 avis, 433 ventes)
- https://b2bpro.store/services/je-vais-comparer-les-clauses-cles-des-conditions-de-vos-concurrents — Je vais comparer les clauses clés des conditions de vos concurrents (★4.8, 6 avis, 323 ventes)
- https://b2bpro.store/services/je-vais-condenser-et-extraire-les-donnees-cles-de-vos-gros-pdf — Je vais condenser et extraire les données clés de vos gros PDF (★4.5, 6 avis, 308 ventes)
- https://b2bpro.store/services/je-vais-extraire-tous-les-tableaux-financiers-de-vos-pdf-vers-excel — Je vais extraire tous les tableaux financiers de vos PDF vers Excel (★4.2, 6 avis, 154 ventes)

### Hôtellerie & Tourisme — 8 services

- https://b2bpro.store/services/je-vais-traduire-et-analyser-les-avis-touristes-etrangers-du-secteur — Je vais traduire et analyser les avis touristes étrangers du secteur (★4.9, 27 avis, 1755 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-cartes-et-prix-des-livreurs-concurrents-locaux — Je vais analyser les cartes et prix des livreurs concurrents locaux (★4.5, 40 avis, 1593 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-domaines-de-mariage-et-wedding-planners-zone — Je vais répertorier les domaines de mariage et wedding planners zone (★5, 15 avis, 1272 ventes)
- https://b2bpro.store/services/je-vais-numeriser-votre-menu-ou-catalogue-pour-shopify-et-uber-eats — Je vais numériser votre menu ou catalogue pour Shopify et Uber Eats (★4.6, 26 avis, 986 ventes)
- https://b2bpro.store/services/je-vais-lister-tous-les-grands-evenements-de-votre-ville-sur-6-mois — Je vais lister tous les grands événements de votre ville sur 6 mois (★4.9, 20 avis, 833 ventes)
- https://b2bpro.store/services/je-vais-cartographier-les-producteurs-locaux-autour-de-votre-resto — Je vais cartographier les producteurs locaux autour de votre resto (★4.7, 10 avis, 502 ventes)
- https://b2bpro.store/services/je-vais-relever-les-tarifs-nuitees-et-remplissage-de-vos-20-voisins — Je vais relever les tarifs nuitées et remplissage de vos 20 voisins (★4.5, 6 avis, 121 ventes)
- https://b2bpro.store/services/je-vais-lister-les-comites-d-entreprise-et-clubs-seniors-du-secteur — Je vais lister les comités d'entreprise et clubs séniors du secteur (★4.4, 6 avis, 111 ventes)

### Grandes Entreprises & Finance — 8 services

- https://b2bpro.store/services/je-vais-identifier-50-fabricants-europeens-pour-vos-achats-industriels — Je vais identifier 50 fabricants européens pour vos achats industriels (★4.4, 30 avis, 1158 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-appels-d-offres-europeens-ouverts-du-secteur — Je vais répertorier les appels d'offres européens ouverts du secteur (★4.9, 17 avis, 1086 ventes)
- https://b2bpro.store/services/je-vais-surveiller-les-nouvelles-marques-et-brevets-de-vos-concurrents — Je vais surveiller les nouvelles marques et brevets de vos concurrents (★4.5, 11 avis, 965 ventes)
- https://b2bpro.store/services/je-vais-verifier-les-mentions-legales-et-conformite-rgpd-de-vos-sites — Je vais vérifier les mentions légales et conformité RGPD de vos sites (★4.6, 14 avis, 519 ventes)
- https://b2bpro.store/services/je-vais-auditer-la-sante-financiere-publique-de-vos-fournisseurs — Je vais auditer la santé financière publique de vos fournisseurs (★4.9, 6 avis, 444 ventes)
- https://b2bpro.store/services/je-vais-compiler-les-engagements-rse-et-indicateurs-esg-concurrents — Je vais compiler les engagements RSE et indicateurs ESG concurrents (★4.6, 7 avis, 415 ventes)
- https://b2bpro.store/services/je-vais-controler-les-prix-pratiques-par-les-revendeurs-de-votre-marqu — Je vais contrôler les prix pratiqués par les revendeurs de votre marque (★4.6, 7 avis, 287 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor — Je vais analyser les avis employés et salaires de 5 rivaux Glassdoor (★4.4, 6 avis, 150 ventes)

### Grand Public & Quotidien — 8 services

- https://b2bpro.store/services/je-vais-comparer-le-prix-de-vos-materiaux-chez-4-grandes-enseignes — Je vais comparer le prix de vos matériaux chez 4 grandes enseignes (★4.5, 29 avis, 1593 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-locations-sans-frais-d-agence-de-votre-ville — Je vais répertorier les locations sans frais d'agence de votre ville (★4.8, 39 avis, 1494 ventes)
- https://b2bpro.store/services/je-vais-trouver-le-meilleur-tarif-reel-pour-votre-prochain-sejour — Je vais trouver le meilleur tarif réel pour votre prochain séjour (★4.6, 41 avis, 1443 ventes)
- https://b2bpro.store/services/je-vais-calculer-la-vraie-cote-de-vos-objets-de-collection-et-montres — Je vais calculer la vraie cote de vos objets de collection et montres (★4.7, 23 avis, 1348 ventes)
- https://b2bpro.store/services/je-vais-creer-le-bilan-des-ecoles-et-commodites-de-votre-quartier — Je vais créer le bilan des écoles et commodités de votre quartier (★4.9, 20 avis, 887 ventes)
- https://b2bpro.store/services/je-vais-denicher-100-offres-d-emploi-ou-alternance-pour-votre-profil — Je vais dénicher 100 offres d'emploi ou alternance pour votre profil (★4.8, 17 avis, 867 ventes)
- https://b2bpro.store/services/je-vais-comparer-les-tarifs-et-disponibilites-des-ehpad-de-votre-zone — Je vais comparer les tarifs et disponibilités des EHPAD de votre zone (★4.8, 6 avis, 96 ventes)
- https://b2bpro.store/services/je-vais-analyser-100-annonces-auto-pour-denicher-la-meilleure-affaire — Je vais analyser 100 annonces auto pour dénicher la meilleure affaire (★4.8, 6 avis, 94 ventes)

### SaaS & Tech — 7 services

- https://b2bpro.store/services/je-vais-comparer-les-plans-tarifaires-et-options-de-20-logiciels-saas — Je vais comparer les plans tarifaires et options de 20 logiciels SaaS (★4.8, 58 avis, 1882 ventes)
- https://b2bpro.store/services/je-vais-lister-les-fonds-investissement-et-business-angels-actifs — Je vais lister les fonds investissement et Business Angels actifs (★4.8, 34 avis, 1803 ventes)
- https://b2bpro.store/services/je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra — Je vais extraire les critiques de vos concurrents SaaS sur G2 Capterra (★4.8, 30 avis, 1314 ventes)
- https://b2bpro.store/services/je-vais-surveiller-les-nouvelles-fonctionnalites-de-vos-concurrents — Je vais surveiller les nouvelles fonctionnalités de vos concurrents (★4.8, 15 avis, 825 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-nouveaux-outils-ia-et-saas-lances-ce-mois-ci — Je vais répertorier les nouveaux outils IA et SaaS lancés ce mois-ci (★4.3, 17 avis, 567 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-extensions-les-plus-installees-de-votre-niche — Je vais analyser les extensions les plus installées de votre niche (★4.3, 10 avis, 424 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-avis-1-etoile-des-applications-mobiles-rivales — Je vais analyser les avis 1 étoile des applications mobiles rivales (★5, 6 avis, 278 ventes)

### Formation & Santé — 7 services

- https://b2bpro.store/services/je-vais-identifier-les-aides-et-subventions-publiques-pour-votre-proje — Je vais identifier les aides et subventions publiques pour votre projet (★4.5, 53 avis, 1814 ventes)
- https://b2bpro.store/services/je-vais-constituer-votre-fichier-de-pharmacies-et-magasins-bio-region — Je vais constituer votre fichier de pharmacies et magasins bio région (★4.6, 21 avis, 1793 ventes)
- https://b2bpro.store/services/je-vais-compiler-les-etudes-scientifiques-sur-votre-sujet-pubmed — Je vais compiler les études scientifiques sur votre sujet PubMed (★4.4, 42 avis, 1605 ventes)
- https://b2bpro.store/services/je-vais-vous-fournir-le-fichier-des-mairies-ciblees-selon-population — Je vais vous fournir le fichier des mairies ciblées selon population (★4.8, 27 avis, 1356 ventes)
- https://b2bpro.store/services/je-vais-lister-les-associations-sportives-de-votre-departement-rna — Je vais lister les associations sportives de votre département RNA (★4.9, 14 avis, 553 ventes)
- https://b2bpro.store/services/je-vais-analyser-les-tarifs-et-avis-des-formations-cpf-concurrentes — Je vais analyser les tarifs et avis des formations CPF concurrentes (★4.2, 6 avis, 149 ventes)
- https://b2bpro.store/services/je-vais-identifier-les-cours-en-ligne-les-plus-vendus-de-votre-niche — Je vais identifier les cours en ligne les plus vendus de votre niche (★4.8, 6 avis, 107 ventes)

### Logistique & Franchises — 6 services

- https://b2bpro.store/services/je-vais-mettre-en-place-votre-veille-sur-les-rappels-de-produits-flux — Je vais mettre en place votre veille sur les rappels de produits flux (★4.6, 47 avis, 1604 ventes)
- https://b2bpro.store/services/je-vais-comparer-30-franchises-de-votre-secteur-apport-et-rentabilite — Je vais comparer 30 franchises de votre secteur apport et rentabilité (★4.6, 23 avis, 1499 ventes)
- https://b2bpro.store/services/je-vais-cartographier-les-bornes-electriques-et-zones-blanches-region — Je vais cartographier les bornes électriques et zones blanches région (★4.5, 24 avis, 1450 ventes)
- https://b2bpro.store/services/je-vais-denicher-30-marques-etrangeres-a-succes-non-vendues-en-france — Je vais dénicher 30 marques étrangères à succès non vendues en France (★4.5, 27 avis, 972 ventes)
- https://b2bpro.store/services/je-vais-realiser-l-audit-complet-de-votre-visibilite-web-vs-3-rivaux — Je vais réaliser l'audit complet de votre visibilité web vs 3 rivaux (★4.9, 10 avis, 859 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-ventes-aux-encheres-de-materiel-pro-et-stocks — Je vais répertorier les ventes aux enchères de matériel pro et stocks (★4.9, 15 avis, 484 ventes)

### Événementiel & Marchés Publics — 5 services

- https://b2bpro.store/services/je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro — Je vais extraire la liste complète des exposants d'un salon pro (★4.7, 28 avis, 1434 ventes)
- https://b2bpro.store/services/je-vais-lister-les-entreprises-ayant-remporte-des-marches-publics — Je vais lister les entreprises ayant remporté des marchés publics (★4.5, 18 avis, 1032 ventes)
- https://b2bpro.store/services/je-vais-configurer-votre-veille-sur-mesure-des-marches-publics-boamp — Je vais configurer votre veille sur mesure des marchés publics BOAMP (★4.8, 22 avis, 869 ventes)
- https://b2bpro.store/services/je-vais-vous-fournir-la-liste-complete-des-exposants-d-un-salon-pro — Je vais vous fournir la liste complète des exposants d'un salon pro (★4.8, 10 avis, 826 ventes)
- https://b2bpro.store/services/je-vais-creer-votre-veille-personnalisee-des-appels-d-offres-publics — Je vais créer votre veille personnalisée des appels d'offres publics (★4.2, 9 avis, 785 ventes)

### RH & Recrutement — 4 services

- https://b2bpro.store/services/je-vais-compiler-les-salaires-proposes-par-vos-rivaux-sur-vos-metiers — Je vais compiler les salaires proposés par vos rivaux sur vos métiers (★5, 42 avis, 1425 ventes)
- https://b2bpro.store/services/je-vais-repertorier-les-avantages-employeurs-phares-de-votre-secteur — Je vais répertorier les avantages employeurs phares de votre secteur (★4.9, 6 avis, 486 ventes)
- https://b2bpro.store/services/je-vais-identifier-les-entreprises-avec-postes-vacants-depuis-60j — Je vais identifier les entreprises avec postes vacants depuis +60j (★4.4, 6 avis, 423 ventes)
- https://b2bpro.store/services/je-vais-reperer-les-entreprises-qui-ouvrent-une-agence-dans-votre-vill — Je vais repérer les entreprises qui ouvrent une agence dans votre ville (★5, 8 avis, 307 ventes)

---

*Document généré depuis la base locale le 2026-11-10 (v1.6.2) — mettre à jour à chaque
nouveau service (régénérer via `bun run scripts/gen-gsc-urls.ts`).*
