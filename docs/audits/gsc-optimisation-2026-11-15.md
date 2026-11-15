# Audit — Optimisation SEO guidée par les premiers rapports GSC (2026-11-15)

> **Source :** rapports GSC fournis par le propriétaire (6 captures, propriété
> `https://b2bpro.store/`, fenêtre 3 mois, recherche Web, dernière mise à jour
> il y a 3,5 h au moment des captures). **Objet :** transformer ces premiers
> signaux en actions concrètes pour remonter les pages en page 1, puis en
> position 1. Deux chantiers ont été livrés le jour même (v2.7.0) : la
> réparation intégrale du maillage interne du blog (43 liens cassés) et le
> retargeting des 4 articles porteurs d'impressions.

---

## 1. Ce que disent les rapports (extraction intégrale)

### 1.1 Vue d'ensemble (onglets Pays et Appareils)

| Dimension | Impressions | Position moyenne |
|---|---|---|
| **Total fenêtre 3 mois** | **86** | ≈ 60 (pondéré) |
| Ordinateur | 77 | 62,1 |
| Mobile | 8 | 38,6 |
| Tablette | 1 | 101,0 |
| France | 54 | 53,3 |
| Canada | 12 | 89,5 |
| Belgique | 8 | 66,0 |
| Luxembourg | 4 | 95,0 |
| Cameroun | 3 | **7,0** |
| Suisse | 3 | 97,0 |
| Guinée | 1 | **5,0** |
| Maroc | 1 | 11,0 |

**Clics : 0 sur toute la fenêtre.** Le site est jeune (premières impressions
concentrées sur la fenêtre 09-13/11) : Google crawle et teste déjà les pages,
mais sur des positions trop profondes pour générer des clics, sauf exceptions
ci-dessous. Deux enseignements structurels :

1. **Le mobile et l'Afrique francophone positionnent nettement mieux**
   (mobile 38,6 vs ordinateur 62,1 ; Cameroun 7,0, Guinée 5,0) : les marchés
   moins concurrents de la cible « tous les pays francophones » sont des
   victoires rapides à consolider.
2. Les impressions se concentrent sur 4 articles de blog : c'est là que Google
   teste le site. Le catalogue de fiches service, lui, ne montre presque rien
   encore (une seule fiche : artisans RGE, pos. 11).

### 1.2 Pages (15 URLs avec impressions, onglet Pages)

| Page | Impressions | Position | Lecture |
|---|---|---|---|
| `/blog/veille-concurrentielle-efficace` | 31 | 76,1 | Testé sur « logiciel de veille concurrentielle » |
| `/blog/seo-local-google-maps` | 21 | 66,7 | Testé sur « local map pack » / « local pack seo » |
| `/blog/generation-leads-b2b` | 10 | 88,9 | Testé sur « génération de leads b2b » |
| `/blog/seo-geo-aio-guide-complet` | 8 | 45,8 | Testé sur questions « solution GEO » |
| `/services/…artisans-certifies-rge` | 4 | **11,0** | La seule fiche service testée — page 2 ! |
| `/vendeurs/elise-bonnard` | 2 | 6,5 | Presque page 1 |
| `/vendeurs/serge-mbarga` | 2 | 9,5 | Page 1 en puissance |
| `/blog/freelance-b2b-francophone` | 1 | **2,0** | Déjà quasi n°1 sur sa requête |
| `/services` | 1 | 4,0 | — |
| `/services?q=franchise secteur` | 1 | 4,0 | Variante d'URL avec param (canonical `/services` en place, sans impact) |

### 1.3 Requêtes (32 requêtes, onglet Requêtes — regroupées par intention)

| Famille d'intention | Requêtes (impressions, position) | Page testée |
|---|---|---|
| **Logiciel / outil de veille concurrentielle** | logiciel de veille concurrentielle (13, 95,7) · logiciel de veille commerciale (6, 52,5) · outil de veille concurrentielle prix (1, 70) · veille concurrentielle prix (2, 97) · veille concurrentielle (2, 59,5) · veille concurrentielle site internet (1, 55) · veille ecommerce (1, 59) · surveillance des prix des concurrents (1, 94) · veille tarifaire pour la distribution (2, 51) · veille tarifaire ecommerce (1, 101) · veille achats (1, **7,0**) | blog veille |
| **Local pack / map pack (SEO local)** | local map pack (9, 59,0) · local pack seo rapport seo client (4, 56,5) · local map pack seo (3, 86,0) · local maps seo (2, 77,0) · map pack google (1, 81) · local pack seo (1, 96) · google local pack seo (1, 97) | blog seo local |
| **Génération de leads B2B** | génération de leads b2b (9, 97,7) · strategie lead generation b2b (1, **10,0**) | blog leads |
| **Choix d'une solution GEO** | quelle solution de geo s'adapte le mieux à une équipe déjà équipée d'un outil seo ? (2, 58,5) · quelle plateforme combine seo et geo ? (1, **10,0**) · comment choisir une solution de generative engine optimization geo ? (1, **11,0**) · quel outil choisir pour du geo en plusieurs langues ? (1, 64) · getmint ou surfer seo… (1, 38) · getmint ou meteoria… (1, 66) | blog GEO |
| **Navigational / marque** | b2b pro (1, 4,0) · solutions-pro-b2b.fr artisans (4, 11,0) · site solutione-pro.b2b.fr (1, 4,0) · elise bonnard (1, 6,0) · raphael guillon (1, 10,0) | divers |
| **Longue traîne IA** | j'ai testé un outil geo qui ne donne que des dashboards… (1, 60) | blog GEO |

---

## 2. Actions livrées le jour même (v2.7.0)

### 2.1 Découverte structurante : 43 liens internes cassés (tous réparés)

Le scan déclenché par l'audit GSC a révélé que **100 % des liens absolus
`https://b2bpro.store/services/<slug>` insérés dans les 12 articles du blog
pointaient vers des slugs courts inexistants (404)** : `veille-boamp`,
`artisans-rge`, `audit-visibilite-ia`, `fichier-prospection-b2b`,
`people-also-ask`, `micro-influenceurs`, etc. Aucune exception : 43 occurrences
sur 43 cassées. Conséquence : le maillage éditorial blog → fiches service
n'existait pas (les audits comptaient les liens sans en valider les cibles).

**Réparation :** mapping sémantique établi ancre par ancre (l'ancre du lien
dit l'intention : « veille des marchés publics BOAMP » → `je-vais-configurer-
votre-veille-sur-mesure-des-marches-publics-boamp`, etc.), chaque cible
validée en base avant écriture, script idempotent, scan final : **0 lien
cassé**. Effet attendu : le link equity des articles (les seules pages que
Google crawl déjà) coule désormais vers les fiches service, dont la fiche
artisans RGE à la position 11.

### 2.2 Retargeting des 4 articles porteurs (les requêtes dans le titre, le H1, l'en-tête)

| Article | Avant (titre) | Après (titre, ≤ 68 car.) |
|---|---|---|
| veille-concurrentielle-efficace | « Veille concurrentielle : la méthode pour surveiller prix, stocks et avis » (pos. 76,1 / 31 impr.) | **« Logiciel de veille concurrentielle : comparatif, prix et méthode »** |
| seo-local-google-maps | « SEO local : le plan en 10 étapes pour dominer le pack local Google Maps » (pos. 66,7 / 21 impr.) | **« SEO local : dominer le local pack (map pack) de Google Maps »** |
| seo-geo-aio-guide-complet | inchangé (titre déjà aligné) + section choix d'outil | section **« Quelle solution de GEO choisir ? »** (les 3 questions GSC exactes en H3 : équipe équipée SEO, plateforme combinée, GEO multilingue, comparaison GetMint/Surfer/Meteoria) |
| generation-leads-b2b | inchangé + réponse-first + FAQ | paragraphe **« La réponse en 30 secondes »** en tête + FAQ définition/priorisation |

Détails des insertions (chaque article a reçu les requêtes exactes GSC dans
les H2/H3/FAQ, avec liens absolus vers les services réels et prix vérifiés en
base) :

- **Blog veille** : H2 « Quel logiciel de veille concurrentielle choisir ? »
  (4 familles : alertes gratuites, tableurs pilotés, plateformes e-commerce,
  expert humain + tableau comparatif + budgets), FAQ « Quel est le meilleur
  logiciel de veille concurrentielle ? » et « Combien coûte une veille
  tarifaire pour la distribution ? » ; première phrase remaniée pour porter
  « logiciel » dès l'attaque.
- **Blog SEO local** : H2 « Local pack, map pack, 3-pack : le vocabulaire du
  SEO local » (les anglicismes exacts des requêtes), FAQ « Comment suivre vos
  positions dans le local pack pour un rapport SEO client ? » (geo-grid —
  requête « local pack seo rapport seo client », 4 impr.), synonymes
  « local pack (map pack) » posés dès la première phrase de réponse.
- **Blog GEO** : H2 « Quelle solution de GEO choisir ? » + 4 H3 reprenant les
  questions exactes (pos. 10-11-38-58-64-66) + FAQ « Comment choisir une
  solution de Generative Engine Optimization (GEO) ? ».
- **Blog leads** : réponse-first en tête (définition + promesse des 15
  stratégies) + FAQ « Qu'est-ce que la génération de leads B2B ? » et « Quelle
  stratégie de lead generation B2B prioriser quand on part de zéro ? ».

Toutes les modifications respectent le standard éditorial audit:seo /
audit:content (titres ≤ 68 car. pour un title tag entier, excerpts 80-200,
zéro tiret cadratin, aucun nombre figé, ≥ 3 H2, ≥ 3 liens absolus) :
**audit:seo 1799 contrôles verts, audit:content 1666/1666 verts, garde 19/19,
lint vert, vérification navigateur OK** (titres rendus, sections présentes,
liens réparés → HTTP 200).

---

## 3. Plan d'attaque pour la page 1 puis la position 1 (ordre de priorité)

### 3.1 Immédiat (chaque jour, 10 min — suivre docs/GSC-SOUMISSION-QUOTIDIENNE.txt)

1. **Redemander l'indexation des 6 URLs modifiées** dès le déploiement en
   production : `/blog/veille-concurrentielle-efficace`,
   `/blog/seo-local-google-maps`, `/blog/seo-geo-aio-guide-complet`,
   `/blog/generation-leads-b2b`, `/services/je-vais-vous-fournir-la-liste-
   officielle-des-artisans-certifies-rge` (bénéficiaire du maillage réparé),
   puis `/blog/freelance-b2b-francophone` (pos. 2 : maintenir).
2. **Déployer les changements en production** (le contenu vit en base) :
   `NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:migrate:neon`
   puis re-déploiement Vercel (runbook §1 et §5).
3. Suivre la routine fixe quotidienne (accueil, catalogue, blog) — jamais
   re-demander une URL déjà indexée.

### 3.2 Court terme (2-6 semaines) — consolider les positions 2-11

- **Freelance B2B francophone (pos. 2)** : victoire la plus proche. Obtenir
  quelques liens externes exacts vers cet article et croiser les ancres
  internes (« freelance B2B francophone ») depuis les autres articles.
- **Fiche artisans RGE (pos. 11 → page 1)** : le maillage réparé l'alimente
  enfin (articles immobilier + SEO local). Ajouter si possible 2-3 liens
  entrants externes sur « artisans certifiés RGE » ; les avis clients
  validated renforcent les rich snippets.
- **Questions GEO (pos. 10-11)** : la nouvelle section y répond mot pour mot ;
  position 1 possible sur ces questions de longue traîne à faible
  concurrence.
- **Cameroun / Guinée / Maroc (pos. 5-11)** : consolider par des mentions
  pays ciblées dans les articles concernés (section « et dans les pays
  francophones d'Afrique ? ») — marché peu concurrentiel, aligné avec la
  promesse du site.

### 3.3 Moyen terme (1-3 mois) — passer de « testé » à « placé »

- **Autorité du domaine** : c'est LE facteur limitant (positions 45-101 sur
  les requêtes de tête alors que le contenu est complet). Objectif réaliste :
  5-10 liens entrants de qualité par mois (annuaires métier, syndications,
  partenariats éditoriaux francophones, profils vendeurs qui citent la
  plateforme).
- **Boucler la rotation GSC** (18 jours) pour que les 113 fiches service
  soient toutes découvertes : aujourd'hui une seule fiche collecte des
  impressions ; c'est un plafond de visibilité, pas un plafond de qualité.
- **Frais des données** : les positions sur « logiciel de veille
  concurrentielle » progresseront avec l'âge des pages (les contenus datent
  de 2025 dans le corps) ; planifier une passe « données 2026 » sur les
  articles porteurs à la prochaine fenêtre éditoriale.
- **CTR** : surveiller le CTR dès les premiers clics ; si une URL en position
  4-8 affiche un CTR < 1 %, retester la promesse du titre (chiffre, question,
  année).

### 3.4 Indicateurs de succès (revue hebdomadaire GSC)

| Signal | Aujourd'hui | Cible 4 semaines | Cible 3 mois |
|---|---|---|---|
| Impressions / jour | ≈ 17 | 60+ | 300+ |
| Clics / jour | 0 | 3-5 | 20+ |
| Position moyenne | ≈ 60 | < 40 | < 25 |
| Fiches service avec impressions | 1 | 20+ | 80+ |
| Requêtes en page 1 (pos. ≤ 10) | ≈ 4 | 8 | 20+ |

---

## 4. Fichiers et commandes associés

- Script d'optimisation (idempotent, validé avant écriture) :
  `bun run scripts/gsc-optimisation-2026-11-15.ts`
- Snapshots : `db/snapshots/snapshot-2026-11-15T10-54-23.json` (avant, local) et
  `snapshot-2026-11-15T10-5x` (après, commité).
- Rapports d'audit du jour : `docs/audits/audit-seo-geo-aio-2026-11-15.md`,
  `docs/audits/audit-content-2026-11-15.md`.
- Procédure de soumission : `docs/GSC-SOUMISSION-SERVICES.md` +
  `docs/GSC-SOUMISSION-QUOTIDIENNE.txt` (rotation 18 jours).

*Audit réalisé et implémenté le 2026-11-15 depuis les 6 captures GSC fournies
(par l'intermédiaire du modèle de vision) — v2.7.0.*
