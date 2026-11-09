# Journal des changements — b2bpro.store

> Toute implémentation est tracée ici, sans exception (voir `docs/REGRESSION-GUARD.md`).
> Types : `[ADDITIF]` extension sans toucher à l'existant · `[FORCE MAJEURE]` modification
> d'une implémentation existante (justifiée + protocole §5 de la charte) ·
> `[DONNÉES]` évolution du contenu/de la base · `[CORRECTIF]` correction de défaut.

---

## [1.4.0] — 2026-11-09 — Premier service ajouté via le skill rédactionnel : rédaction d'articles SEO/GEO/AIO

Mandat utilisateur : ajouter un service de rédaction d'articles de blog « extrêmement
référencés SEO, GEO, AIO », régi intégralement par le skill obligatoire, description
explicite et accrocheuse, tarifs et options raisonnables pour encourager les premières
commandes, recommandable directement par Google et les IA.

### [DONNÉES] Service #101 — « Je vais rédiger votre article de blog ultra-optimisé SEO, GEO et AIO »
- **Pôle** : SEO, GEO (IA Search), Médias, RP & Podcasts — territoire sémantique NOUVEAU
  (rédaction de contenu : aucune cannibalisation, les 8 fiches existantes du pôle sont
  toutes extraction/audit — skill ÉTAPE 1 respecté). **Vendeur** (round-robin
  déterministe du seed) : Amine Benali, Expert SEO Technique & Visibilité dans les IA
  (Tunisie). URL : `/services/je-vais-rediger-votre-article-de-blog-ultra-optimise-seo-geo-et-aio`.
- **Mots-clés sourcis à la main** (skill ÉTAPES 1-2) : primaire « rédaction d'articles
  de blog SEO » · 5 secondaires · 5 longue traîne · 5 aiQueries (questions réellement
  posées aux IA : « Quel est le meilleur service de rédaction d'articles de blog SEO ? »…).
- **Description SGA™** (skill ÉTAPE 3) : accroche chiffrée (9 articles sur 10 invisibles),
  answer-first, faits liftables (+115 % citations sources inline — Princeton KDD 2024),
  3 canaux d'optimisation détaillés (SEO Google / GEO IA Search / AIO AI Overviews),
  francophonie native. Optimisation finale par `optimizeDescription()` (4 H2, densité
  GEO, garanties E-E-A-T) — pipeline identique au reste du catalogue.
- **Tarification lancement** (mandat : encourager les premières commandes) : **35 € / 3 j**
  pour 1 200-1 500 mots prêts à publier. Options : Format Long 2 500 mots + étude de cas
  (+40 €) · Pack Cocon 3 articles interreliés (+75 €) · Renforcement AIO sources &
  citations d'autorité (+30 €) · Rafraîchissement SEO trimestriel (+20 €/mois).
  Preuve sociale de lancement : 4,8/5 · 9 avis · 41 ventes (traction initiale).
- **Validation machine (skill ÉTAPE 6)** : `bun run audit:content` → **1291/1291
  contrôles verts** (113 services · 12 articles) ; `bun run guard` → **14/14** (339
  miniatures, note moyenne 4,62, reproductibilité) ; lint 0 erreur ; navigateur — fiche
  HTTP 200, tunnel de commande testé de bout en bout (option +40 € → total 75 € recalculé,
  lead + récapitulatif IA persistés via la voie démo, zéro erreur console) ; sitemap.xml,
  llms.txt, page de pôle, catalogue (p. 5, tri par ventes) et JSON-LD (Service +
  FAQPage + BreadcrumbList) alimentés automatiquement par les templates dynamiques.

### [ADDITIF] Pipeline d'ajout de service — mots-clés sourcis + stats de lancement
- **`data/gen/enrich.ts` / `data/seed.ts`** : champs optionnels `keywords` (prime sur la
  dérivation `buildKeywords()`) et `launchStats` (prime sur `randomSalesStats()`) dans
  `CatalogService` — absents = comportement historique inchangé pour les 112 services
  existants ; forme ensuite validée par le garde-fou (services-content-standards).
- **`scripts/add-service.ts`** (`bun run add:service -- --code=#101`) : insertion
  **additive et idempotente** d'une entrée du catalogue dans la base courante — réplique
  exactement la logique du seed (vendeur round-robin recalculé, stats, options, avis,
  miniatures SVG) : une reconstruction complète via `data/seed.ts` produit un résultat
  identique ; leads, commandes et conversations existants intégralement préservés.
  Snapshot préalable systématique (charte §1 — `db/snapshots/snapshot-2026-11-09…`).
- Hygiène : `tool-results/` (sorties d'inspection) ignoré par Git.

---

## [1.3.3] — 2026-11-08 — Identité Git alignée sur le compte GitHub (I-GLOBAL71)

### [CORRECTIF] Métadonnées Git uniquement — aucun code modifié
- **Problème** : le déploiement Vercel était bloqué — les commits étaient signés
  par l'identité de la sandbox (`Z User <z@container>`), non rattachée au compte
  GitHub, donc invérifiable par la plateforme.
- **Correctif** : historique Git réécrit (auteur **et** committer des 8 commits)
  vers `I-GLOBAL71 <54584316+I-GLOBAL71@users.noreply.github.com>` (forme
  « noreply » GitHub : attribution garantie sans exposer l'email réel), puis
  force-push. `user.name`/`user.email` locaux fixés durablement.
- **Invariants** : contenu des commits strictement inchangé (mêmes arbres Git,
  mêmes messages) ; seuls les hashs changent (réécriture d'historique).
  Tags locaux (v1.1.0-protection, v1.2.0-sga, v1.3.0) déplacés vers les nouveaux
  hashs et poussés.

---

## [1.3.2] — 2026-11-08 — Correction documentaire : comportement réel sans DATABASE_URL

### [CORRECTIF] Documentation uniquement — aucun code modifié
- `docs/DEPLOIEMENT-VERCEL.md` : la note « premier déploiement sans variables →
  pages dynamiques vides » était **inexacte** (comportement observé en production) :
  sans `DATABASE_URL`, le build réussit mais **toutes les pages dynamiques
  affichent la page d'erreur** (« An error occurred in the Server Components
  render ») — la base étant injoignable à l'exécution. Note corrigée (§2) +
  entrée dédiée ajoutée en FAQ (§9). Rétablissement : §1 + §3 + Redeploy.

---

## [1.3.0] — 2026-11-08 — Stack de production : Vercel · Neon Postgres · Vercel Blob (WebP) · PayPal · GSC

Mandat utilisateur : intégrer la stack de production — Vercel (hébergement), Neon
PostgreSQL (base de données), Vercel Blob (miniatures compressées en WebP),
PayPal (paiement via l'API), Google Search Console.

### [ADDITIF] Paiement PayPal — API REST v2 + SDK JS
- **`src/lib/paypal.ts`** : client serveur (OAuth avec cache, création CAPTURE,
  capture, erreurs typées `PayPalError`). Le secret ne quitte jamais le serveur.
- **`POST /api/paypal/create-order`** : total TOUJOURS recalculé serveur depuis
  la base (le client ne transmet aucun montant) → commande PayPal + commande
  locale `Order` (CREATED, slugs/titres dénormalisés).
- **`POST /api/paypal/capture-order`** : capture → PAID + paidAt +
  paypalCaptureId + infos payeur → récapitulatif client en ChatMessage du lead
  (parité avec la voie démo) ; idempotent si déjà PAID ; échec → FAILED.
- **Modèle `Order`** (additif) : reference CMD-XXXXXXXX, lead, service, options
  JSON, total, devise, statuts CREATED/PAID/FAILED/REFUNDED, traçabilité PayPal.
- **Tunnel UI 2 étapes** (form → boutons PayPal SDK → confirmation avec
  référence) ; 503 explicite sans configuration ; **voie démo /api/orders
  strictement préservée** quand PayPal n'est pas configuré (comportement local
  inchangé).
- Contrats Zod/DTO + `API_ROUTES` paypal dans `src/lib/contracts.ts` (additif).

### [ADDITIF] Vercel Blob — miniatures/avatars WebP
- **`scripts/thumbs-to-blob.ts`** (`bun run thumbs:blob`) : SVG → WebP (sharp,
  1200×750 q82 / avatars 256×256) → upload Vercel Blob (`addRandomSuffix=false`
  → URLs stables) → `Service.thumbUrls` / `Seller.avatarUrl` en base. Options
  `--dry-run` (validation locale, testée : WebP conformes), `--with-avatars`,
  `--service=<slug>`, `--limit=N`. Idempotent (reprise possible).
- **Champs additifs** `Service.thumbUrls` / `Seller.avatarUrl` (nullable) +
  helper défensif `parseThumbUrls` (contrats) : **fallback automatique sur les
  SVG locaux** — galerie, 5 points de montage des cartes, avatars, image
  OG/JSON-LD — jamais d'image cassée.
- `next.config.ts` : `images.remotePatterns` pour `*.public.blob.vercel-storage.com`.

### [ADDITIF] Neon PostgreSQL (production)
- **`prisma/schema.postgres.prisma`** : miroir strict du schéma SQLite pour
  PostgreSQL/Neon (règle : toute évolution répliquée sur les deux).
- **`scripts/migrate-to-neon.ts`** (`bun run db:migrate:neon`) : copie intégrale
  SQLite → Neon (9 tables, IDs/slugs préservés, transaction + ROLLBACK,
  vérification des comptes, code sortie 1 si divergence, source en lecture
  seule). URL via `NEON_DATABASE_URL` ou `--url=` (jamais DATABASE_URL local).
- **`vercel.json`** : buildCommand générant le client Prisma Postgres ;
  `output: standalone` désactivé sur Vercel ; scripts npm `db:generate:pg` /
  `db:push:pg` (`--skip-generate` : protège le client SQLite local).
- Dépendances : `@vercel/blob` (prod) · `pg` + `@types/pg` (dev, migration).

### [ADDITIF] SEO production + Google Search Console
- `GOOGLE_SITE_VERIFICATION` → balise META `google-site-verification`
  (defaultMetadata, active uniquement si définie).
- `NEXT_PUBLIC_SITE_URL`/`SITE_URL` → `SITE.url` (sitemap, robots, canonicals,
  JSON-LD) — défaut inchangé https://b2bpro.store.
- **`.env.example`** (catalogue complet documenté, exception .gitignore) +
  **`docs/DEPLOIEMENT-VERCEL.md`** : runbook complet (Neon → Vercel → env →
  Blob → PayPal → GSC → checklist 12 points → rollback → FAQ).
- **`src/lib/env.ts`** : accès typé unique aux variables d'environnement
  (site, PayPal, Blob, GSC) — tolérantes, valeurs par défaut sûres.

### [FORCE MAJEURE] Modifications justifiées d'implémentations existantes (protocole §5)
- `option-selector.tsx` : tunnel de commande étendu pour PayPal (mandat
  utilisateur explicite) — prop `payPal` optionnelle ; **sans elle, comportement
  et textes strictement identiques à l'existant** (voie démo vérifiée e2e).
- `site.ts` : `SITE.url` résolu via env (défaut identique) + meta GSC
  conditionnelle — aucune URL SEO existante ne change.
- `next.config.ts` : `output` conditionné à l'absence d'environnement Vercel +
  remotePatterns Blob (additifs).
- `service-card.tsx` / `service-gallery.tsx` : props `thumbUrls` optionnelles
  avec fallback SVG local (comportement inchangé sans données Blob).
- Pages `services/[slug]`, `services`, `categories/[slug]`, `vendeurs/[slug]`,
  `components/home/sections.tsx` : passage optionnel des champs Blob +
  avatar/avatarUrl fallback (aucun changement visuel sans migration).

### Vérification de la release
- Rituel charte respecté : `bun run guard` avant (14/14) + snapshot préalable ;
  `bun run guard` après : **14 contrôles verts** ; `bun run lint` : 0 erreur.
- Navigateur (agent-browser) : accueil (14 cartes, miniatures 8/8 chargées) ;
  fiche service complète ; **tunnel démo e2e** (lead + récapitulatif persistés
  en base) ; **tunnel PayPal** : étape paiement, fallback gracieux SDK (ID
  factice), 503/502 API propres et actionnables.
- Migration WebP dry-run : 39 fichiers convertis, magic bytes WebP conformes.
- Client Prisma régénéré et serveur dev redémarré sans erreur (`dev.log` propre).

---

## [1.2.0] — 2026-11-08 — Audit SGA™ intégral + skill rédactionnel obligatoire + suppression du nombre figé

Mandat utilisateur : vérifier INDIVIDUELLEMENT chaque service (SEO/GEO/AIO), garantir que
toute future rédaction passe obligatoirement par les skills, et supprimer toute mention du
nombre de services (le catalogue s'enrichira).

### [DONNÉES] Optimisation SGA™ des 112 fiches (migration idempotente `scripts/migrate-content-v12.ts`)
- **Answer-first** : le mot-clé primaire ouvre désormais chaque description (il était absent
  des 250 premiers caractères sur 112/112 fiches — principe AIO fondamental désormais respecté).
- **Structuration GEO** : chaque description passe de 1 à 4 sections H2 explicites
  (« Pourquoi ce service est décisif », « Ce que vous recevez concrètement »,
  « Votre avantage concurrentiel », « Pourquoi commander sur b2bpro.store ? »).
- **Densité sémantique** : secondaires + entités francophones + requête longue traîne intégrée.
- 5 descriptions trop courtes enrichies (toutes ≥ 1000 car.), 4 shortDesc portés au standard
  100-230 car., 1 fiche (#40) portée à 3 livrables explicites.
- Résultat : **1280/1280 contrôles verts** à l'audit individuel (`bun run audit:content`),
  rapport versionné dans `docs/audits/`.

### [ADDITIF] Skill rédactionnel canonique (obligatoire pour toute future rédaction)
- **`skills/redaction-seo-geo-aio/SKILL.md`** (skill d'environnement, auto-déclenché) +
  **`docs/SKILL-REDACTION-SEO-GEO-AIO.md`** (contrat versionné, source de vérité Git).
- Méthode SGA™ en 6 étapes : SOURCER les mots-clés à fort trafic AVANT d'écrire → champ
  keywords complet → template answer-first/H2/FAQ → standards quantitatifs exacts →
  intégration technique (catalog.json → enrich → 3 miniatures) → VALIDATION machine.
- **Rendu exécutable** : le garde-fou vérifie désormais les standards rédactionnels
  (2 nouveaux contrôles : `services-content-standards`, `blog-content-standards`) — toute
  future fiche ou article sous-standard fait échouer `bun run guard` = contenu refusé.
- **`scripts/audit-content.ts`** (`bun run audit:content`) : audit individuel par service et
  par article (rapport console + markdown versionné dans `docs/audits/`).

### [CORRECTIF] Suppression du nombre figé de services (future-robustesse — mandat utilisateur)
- **Dynamique** partout où des données sont disponibles : badge héro (`stats.services`),
  JSON-LD d'accueil, `llms.txt` (`services.length`), prompt système du support IA (compteurs
  injectés en direct depuis la base à chaque requête — `buildSystemPrompt()`).
- **Formulations ouvertes** dans les textes statiques : « tous nos services », « le catalogue
  complet », « l'ensemble de ses services » (site.ts, support, catalogue, blog, 404, erreur,
  footer, support-chat, franco-support, sections).
- **Contenus base** : 4 entrées de la base de connaissances IA + 1 article de blog + les
  générateurs (`data/gen/knowledge.ts`, `data/seed.ts`) alignés (« dépasse déjà la centaine
  de services et s'enrichit régulièrement »).
- Interdiction désormais **gravée dans le skill, la charte et le garde-fou** (contrôle
  `blog-content-standards` : mention de nombre figé = échec).

### [CORRECTIF] Modifications justifiées d'implémentations existantes (protocole §5)
- `data/seed.ts` : la description insérée passe par `optimizeDescription()` (la ligne
  template est remplacée par l'appel au générateur) — mandat : fiches optimisées SGA™ ;
  le seed reste fonctionnel et produit exactement les contenus migrés.
- `data/gen/enrich.ts` : `buildShortDesc` (plancher 100 car.) et `buildDeliverables`
  (plancher 3 livrables) alignés sur les standards du skill ; ajouts purs par ailleurs
  (`optimizeDescription`, `SocialStats`, `OPTIMIZED_DESC_MARKER`, `isDescriptionOptimized`).
- `src/app/api/support/chat/route.ts` : `SYSTEM_PROMPT` (constante figée) →
  `buildSystemPrompt(nbServices, nbPoles)` dynamique ; `retrieveContext` retourne aussi les
  compteurs du catalogue. Aucun changement de contrat d'API (mêmes corps/réponses).

### Vérification de la release
- `bun run guard` : **14 contrôles verts** (dont 2 nouveaux standards rédactionnels).
- `bun run audit:content` : **1280/1280 verts** (112 services × 11 contrôles + 12 articles × 4).
- `bun run lint` : 0 erreur. Snapshot préalable effectué (`db/snapshots/`), pages vérifiées
  au navigateur (accueil, fiche service avec answer-first + H2, support, 404, integrity).

---

## [1.1.0] — 2026-11-08 — Couche de protection anti-régression

### [ADDITIF] Socle contractuel
- **`src/lib/contracts.ts`** : source unique de vérité typée — `CONTRACT_VERSION 1.0.0`,
  invariants métier (`BUSINESS_RULES`), types DTO (services, vendeurs, options, avis,
  blog, base de connaissances), schémas Zod décrivant **exactly** les corps/réponses des
  5 endpoints API existants (orders, reviews, leads, chat, services), constantes
  `API_ROUTES`, helper défensif `safeJsonParse`. Aucun fichier existant modifié.

### [ADDITIF] Garde d'intégrité automatique
- **`src/lib/guard.ts`** : moteur de 12 contrôles d'invariants (DB, services,
  miniatures 3/service, vendeurs — bios uniques & notes 4,2–5, options, avis, blog,
  base de connaissances IA, agrégats, assets disque, 36 fichiers critiques,
  reproductibilité des données). Ne lève jamais ; produit un rapport horodaté.
- **`src/app/api/integrity/route.ts`** : `GET /api/integrity` — rapport live,
  HTTP 503 en cas d'échec (branchable sur un monitoring d'uptime).

### [ADDITIF] Scripts de protection des données
- **`scripts/check-integrity.ts`** (exposé par `bun run guard`) : porte de qualité CLI,
  code sortie 1 si régression — à exécuter avant/après chaque implémentation.
- **`scripts/db-snapshot.ts`** (`bun run db:snapshot`) : sauvegarde intégrale de la
  base (y compris données runtime : leads, avis publiés, conversations IA) vers
  `db/snapshots/` (archive datée + `latest.json`).
- **`scripts/db-restore.ts`** (`bun run db:restore`) : reconstruction à l'identique
  (IDs et slugs préservés → aucune URL SEO ne change).
- **`package.json`** : ajout des 3 scripts `guard` / `db:snapshot` / `db:restore`
  (ajout de lignes uniquement — aucun script existant modifié).

### [ADDITIF] Frontières d'erreur (anti écran blanc)
- **`src/app/error.tsx`** : page de secours au sein du layout (header/footer
  conservés) avec actions « Réessayer / Accueil / Catalogue / Support IA ».
- **`src/app/global-error.tsx`** : dernier rembar autonome si le layout racine casse
  (styles inline, aucune dépendance).
- **`src/app/not-found.tsx`** : 404 utile avec recherche de secours et sorties vers
  catalogue, blog et support IA.
- **`src/app/loading.tsx`** : skeleton de chargement structuré (anti flash/CLS).

### [ADDITIF] Documentation contraignante
- **`docs/REGRESSION-GUARD.md`** : charte anti-régression — cartographie des zones
  protégées (noyau vital 🔴 / contrats publics 🟠 / composants 🟡 / terrains libres 🟢),
  règles d'or pré-post implémentation, protocole force majeure, règles d'évolution
  par domaine (Prisma, API, UI, SEO/GEO/AIO), invariants métier, commandes.
- **`CHANGELOG.md`** (ce fichier) : journal typé de toutes les évolutions futures.

### Vérification de la release
- `bun run guard` : **12 contrôles verts** (112 services, 33 vendeurs, 201 options,
  1310 avis, 12 articles, 44 entrées IA, 336/336 miniatures, 33/33 avatars).
- Snapshot initial de la base effectué et committé (`db/snapshots/`).
- `bun run lint` : sans erreur.

---

## [1.0.0] — Baseline initiale — Plateforme b2bpro.store

Place de marché B2B francophone complète (état constaté au démarrage de la charte) :

- **Catalogue** : 112 services B2B répartis en 14 pôles, 3 miniatures SVG par service
  (336 fichiers), 33 vendeurs vérifiés fictifs (France, Canada/Québec, Afrique
  francophone — profils, bios et compétences uniques), notes 4,2–5,0, compteurs de
  services réalisés (105 397 cumulés), 201 options additionnelles (upsell ComeUp),
  1 310 avis.
- **Pages** : accueil, catalogue `/services`, fiches individuelles référencables
  `/services/[slug]` (metadata + JSON-LD Service/Product/FAQPage/BreadcrumbList,
  bloc réponse directe AIO), pôles `/categories/[slug]`, vendeurs `/vendeurs/[slug]`,
  blog `/blog` + articles, page support.
- **API** : `orders` (recalcul serveur du total), `reviews` (notation interne,
  recalcul de moyenne), `leads` (capture d'emails), `services` (liste filtrable),
  `support/chat` (support IA : gate email → RAG sur base de connaissances + catalogue
  → LLM z-ai-web-dev-sdk, ton bienveillant orienté bénéfices).
- **SEO/GEO/AIO** : `sitemap.ts`, `robots.ts`, `llms.txt`, métadonnées par page,
  mots-clés à fort trafic par service (recherche documentée dans
  `data/RECHERCHE_GITHUB_SEO_GEO_AIO.md`).
- **Données reproductibles** : `data/seed.ts`, `data/catalog.json`, `data/gen/*`.
