# Journal des changements — b2bpro.store

> Toute implémentation est tracée ici, sans exception (voir `docs/REGRESSION-GUARD.md`).
> Types : `[ADDITIF]` extension sans toucher à l'existant · `[FORCE MAJEURE]` modification
> d'une implémentation existante (justifiée + protocole §5 de la charte) ·
> `[DONNÉES]` évolution du contenu/de la base · `[CORRECTIF]` correction de défaut.

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
