# Journal des changements — b2bpro.store

> Toute implémentation est tracée ici, sans exception (voir `docs/REGRESSION-GUARD.md`).
> Types : `[ADDITIF]` extension sans toucher à l'existant · `[FORCE MAJEURE]` modification
> d'une implémentation existante (justifiée + protocole §5 de la charte) ·
> `[DONNÉES]` évolution du contenu/de la base · `[CORRECTIF]` correction de défaut.

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
