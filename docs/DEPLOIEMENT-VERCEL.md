# Runbook de déploiement — b2bpro.store (Vercel · Neon · Blob · PayPal · GSC)

> **Objet :** procédure opérationnelle complète pour mettre b2bpro.store en production
> sur la stack cible : **Vercel** (hébergement, domaine `b2bpro.store`), **Neon
> PostgreSQL** (données), **Vercel Blob** (miniatures WebP), **PayPal** (paiement) et
> **Google Search Console** (vérification de propriété + suivi SEO).
>
> **Durée estimée :** 2 à 3 heures (migration des données incluse ; une demi-journée si
> le DNS et la vérification GSC doivent se propager).
>
> **Prérequis :** repo Git à jour · compte [Vercel](https://vercel.com) · compte
> [Neon](https://neon.tech) · compte [PayPal Développeur](https://developer.paypal.com) ·
> compte [Google Search Console](https://search.google.com/search-console) · contrôle
> DNS du domaine `b2bpro.store`.
>
> **Règle transverse :** la stack est **déjà implémentée** dans le code (schéma Postgres
> miroir, scripts de migration, tunnel PayPal, SEO/GSC). Il n'y a **rien à coder** —
> uniquement des services distants à configurer et des commandes à exécuter.

---

## §0. Vue d'ensemble de l'architecture

```
                 ┌────────────────────────────────────────────────┐
 Visiteur ──────►│  VERCEL (Next.js 16, App Router)               │
 b2bpro.store    │  build (vercel.json) : bunx prisma generate    │
                 │  --schema prisma/schema.postgres.prisma &&     │
                 │  next build          ·  bun install            │
                 └────────┬──────────────┬───────────────┬────────┘
              données     │   miniatures │               │ paiement
                          ▼              ▼               ▼
                ┌───────────────┐  ┌─────────────┐  ┌──────────────┐
                │ NEON Postgres │  │ VERCEL BLOB │  │ PAYPAL       │
                │ pooled conn., │  │ thumbs/*.   │  │ REST v2 +    │
                │ sslmode=      │  │ webp (336)  │  │ SDK JS (EUR) │
                │ require       │  │ avatars (33)│  │ sandbox/live │
                └───────────────┘  └─────────────┘  └──────────────┘
                                   (fallback SVG locaux si champ absent)

 Google Search Console ── balise META (GOOGLE_SITE_VERIFICATION) + sitemap.xml /
                          robots.txt (crawlers IA autorisés) / llms.txt déjà générés
```

### Dual-schéma Prisma (règle fondamentale)

| Schéma | Usage | Runtime |
|---|---|---|
| `prisma/schema.prisma` | **SQLite** — développement local, inchangé | `db/custom.db` |
| `prisma/schema.postgres.prisma` | **PostgreSQL** — miroir strict pour Neon | production Vercel |

- Sur Vercel, le client Prisma est généré depuis le schéma **Postgres** par le
  `buildCommand` de `vercel.json` — aucune configuration manuelle.
- `next.config.ts` désactive automatiquement `output: "standalone"` sur Vercel (env
  `VERCEL` injectée par la plateforme) — le build local (`bun run start`) est inchangé.
- **Toute évolution de l'un des deux schémas DOIT être répliquée sur l'autre**
  (charte anti-régression, `docs/REGRESSION-GUARD.md` §4).

### Catalogue des variables d'environnement

Catalogue complet de référence : `.env.example` (racine du repo).

| Variable | Rôle | Local | Vercel |
|---|---|---|---|
| `DATABASE_URL` | Connexion base : SQLite en local ; **chaîne Neon « Pooled connection » avec `sslmode=require`** sur Vercel | ✅ `file:/home/z/my-project/db/custom.db` | ✅ chaîne Neon pooled |
| `NEON_DATABASE_URL` | Cible de `db:migrate:neon` (migration lancée **depuis la machine locale** ; ne remplace jamais `DATABASE_URL`, qui pointe vers le SQLite local) | ⭕ migration | ❌ inutile |
| `NEXT_PUBLIC_SITE_URL` (ou `SITE_URL`) | URL canonique publique — pilote sitemap, robots, canonicals, JSON-LD (défaut `https://b2bpro.store`) | ❌ (défaut) | ✅ `https://b2bpro.store` |
| `BLOB_READ_WRITE_TOKEN` | Token du Blob Store (upload miniatures/avatars WebP) | ⭕ pour `thumbs:blob` | ⭕ recommandé |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Clés de l'app REST PayPal — le **secret ne quitte jamais le serveur** | ❌ (mode démo) | ⭕ paiement réel |
| `PAYPAL_ENV` | `sandbox` (défaut) ou `live` | ❌ | ⭕ `live` en production |
| `GOOGLE_SITE_VERIFICATION` | Code de vérification GSC (balise META, déjà câblée dans les métadonnées) | ❌ | ⭕ pour la vérification |

> **Mode démo — comportement par défaut :** tant que `PAYPAL_CLIENT_ID` /
> `PAYPAL_CLIENT_SECRET` ne sont **pas** définis, la plateforme utilise la voie
> historique `POST /api/orders` (commande **sans paiement réel**) et les routes PayPal
> répondent `503` *« Paiement PayPal non configuré sur cet environnement »*. Le site est
> donc **entièrement fonctionnel sans clés PayPal** ; le tunnel monétisé s'active dès
> que les variables existent.

---

## §1. Base de données Neon PostgreSQL

1. **Créer le projet Neon** — [neon.tech](https://neon.tech) → *Create project* (ex.
   `b2bpro-store`, région proche de l'audience européenne). ✓ Vous devez voir le
   dashboard du projet avec la base `neondb`.

2. **Récupérer la chaîne « Pooled connection »** — onglet *Dashboard* → bloc
   *Connection Details* → **« Pooled connection »** → copier la chaîne complète :
   ```
   postgresql://user:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   ✓ Vous devez voir `…-pooler…neon.tech` **et** `sslmode=require`. Conservez-la :
   migration (§1) puis `DATABASE_URL` Vercel (§3).

3. **Créer les tables** (depuis la machine locale, à la racine du repo) :
   ```bash
   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:push:pg
   ```
   ✓ Vous devez voir `The database is now in sync with the schema` (le script intègre
   `--skip-generate` : le client Prisma **SQLite local est protégé**).

4. **Copier les données** (migration intégrale, toujours depuis la machine locale) :
   ```bash
   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:migrate:neon
   ```
   (variante : `bun run db:migrate:neon --url="postgresql://…"`.)
   ✓ Vous devez voir en fin d'exécution la **vérification des comptes table par
   table** : `Seller` (33), `Service` (112), `ServiceOption`, `Review`, `BlogPost`,
   `KnowledgeItem`, `Lead`, `ChatMessage`, `Order` — tous ✅ sans divergence. Le script
   s'exécute en **transaction avec ROLLBACK** et termine avec un **code sortie 1 si
   divergence** : vérifiez `echo $?` → `0`.

   Points clés (`scripts/migrate-to-neon.ts`) : copie **intégrale** SQLite → Neon
   (vendeurs, services, options, avis, blog, base de connaissances IA, leads,
   conversations, commandes) · **IDs et slugs préservés** (aucune URL SEO ne change) ·
   **idempotent** (ré-exécution = refresh complet) · source SQLite **en lecture
   seule**. Utilisez impérativement `NEON_DATABASE_URL` et **pas** `DATABASE_URL`.

> ⚠️ **`db:push:pg` seul ne copie PAS les données** — il ne crée/met à jour que
> les tables. Sans l'étape 4, la production démarre sur une base vide. (L'étape 4
> applique d'elle-même le schéma : l'étape 3 sert surtout aux itérations futures.)

---

## §2. Projet Vercel

1. **Importer le repo** — [vercel.com/new](https://vercel.com/new) → importer le
   dépôt Git. Le framework **Next.js** est détecté automatiquement.

2. **Vérifier le build** — `vercel.json` est déjà présent à la racine et s'applique
   automatiquement :
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "nextjs",
     "buildCommand": "bunx prisma generate --schema prisma/schema.postgres.prisma && next build",
     "installCommand": "bun install"
   }
   ```
   ✓ Le premier build doit réussir : la génération du client Prisma **Postgres**
   précède `next build` — c'est ce qui fait tourner la production sur le schéma Neon.

3. **Domaine** — Vercel → *Settings* → *Domains* → ajouter `b2bpro.store` : si le
   domaine est chez un registrar externe, ajouter l'enregistrement `A` (ou `CNAME`
   pour `www`) indiqué par Vercel dans la zone DNS, puis attendre la propagation
   (quelques minutes à 48 h). ✓ Vous devez voir `b2bpro.store` en **Valid
   Configuration** et le site répondre en HTTPS.

> Premier déploiement sans variables : normal si les pages dynamiques sont vides —
> le §3 complète la configuration puis un Redeploy peuplera le site.

---

## §3. Variables d'environnement Vercel

Vercel → *Settings* → *Environment Variables* → environnement **Production** :

| Variable | Valeur Production | Commentaire |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require` | chaîne Neon **« Pooled connection »** (cf. §1.2) |
| `NEXT_PUBLIC_SITE_URL` | `https://b2bpro.store` | URL canonique (sitemap, robots, canonicals, JSON-LD) |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_…` | copié depuis Vercel → Storage (§4) |
| `PAYPAL_CLIENT_ID` | `AeA1QIZX…` | §5 — clés **sandbox** d'abord |
| `PAYPAL_CLIENT_SECRET` | `EGnHDxD_…` | §5 — secret côté serveur uniquement |
| `PAYPAL_ENV` | `sandbox` puis `live` | §5 — `live` après validation sandbox |
| `GOOGLE_SITE_VERIFICATION` | code GSC | §6 — méthode balise META |

1. Après **chaque** ajout/modification : **Redeploy** obligatoire (Deployments →
   menu du dernier déploiement → *Redeploy*) — les variables ne s'injectent que dans
   les builds futurs.
2. ✓ Après redéploiement : accueil et catalogue peuplés (données Neon), et
   `https://b2bpro.store/api/integrity` en HTTP 200 avec `"ok": true` (§7).

> Les variables peuvent être ajoutées progressivement : le site démarre **sans**
> PayPal (mode démo, §0) et sans GSC ; seules `DATABASE_URL` et
> `NEXT_PUBLIC_SITE_URL` sont indispensables au premier lancement utile.

---

## §4. Miniatures WebP sur Vercel Blob

Les miniatures SVG locales (1200×750) sont converties en **WebP qualité 82** via
`sharp` puis téléversées sous `thumbs/<slug>-{1,2,3}.webp` (`addRandomSuffix=false` →
**URLs stables**, script **idempotent**) ; les URLs sont persistées dans
`Service.thumbUrls`.

1. **Créer le Blob Store** — Vercel → *Storage* → *Create Database* → **Blob** →
   nommer (ex. `b2bpro-store`) → rattacher au projet. ✓ Le store apparaît dans la
   liste avec un usage à 0.

2. **Copier le token en local** — Vercel → Storage → `b2bpro-store` → fichier
   *`.env.local`* → copier `BLOB_READ_WRITE_TOKEN` dans le `.env` local. C'est le
   **prérequis** de `bun run thumbs:blob`.

3. **Validation sans risque** :
   ```bash
   bun run thumbs:blob --dry-run
   ```
   ✓ Conversion locale uniquement (sortie dans `public/thumbs-webp/`, **base
   inchangée, aucun upload**) avec le gain de taille par fichier.

4. **Migration réelle** :
   ```bash
   bun run thumbs:blob --with-avatars
   ```
   ✓ Upload des **336 miniatures** + des **33 avatars** (256×256 →
   `Seller.avatarUrl`), puis écriture des champs en base. Options : `--service=<slug>`
   (un seul service, test/reprise), `--limit=N` (les N premiers).

5. **Vérification** — inspecter le HTML d'une fiche : ✓ les images pointent vers
   `https://…public.blob.vercel-storage.com/thumbs/<slug>-1.webp` (domaine déjà
   autorisé dans `next.config.ts` via `remotePatterns`
   `*.public.blob.vercel-storage.com` pour `next/image`).

> **Fallback automatique :** si `thumbUrls`/`avatarUrl` est absent, les **SVG
> locaux** continuent d'être servis — **jamais d'image cassée** (cf. §8, ajout d'un
> service).

---

## §5. Paiement PayPal

### Déjà implémenté (à connaître avant de configurer)

- **Tunnel 2 étapes sur chaque fiche service** : formulaire (nom/email/brief) →
  boutons PayPal (SDK JS
  `https://www.paypal.com/sdk/js?client-id=…&currency=EUR&locale=fr_FR&intent=capture`)
  → capture serveur → confirmation avec référence.
- **Routes API** :
  - `POST /api/paypal/create-order` — total **TOUJOURS recalculé côté serveur depuis
    la base** (le client ne transmet **aucun montant**) ; crée une commande locale
    `Order` statut `CREATED` + une commande PayPal `intent CAPTURE` ;
  - `POST /api/paypal/capture-order` — capture, marque `PAID` (+ `paidAt`,
    `paypalCaptureId`, `payerEmail`), écrit le récapitulatif client en `ChatMessage`
    du lead ; **idempotent** si déjà `PAID` ; échec → `FAILED`.
- **Modèle `Order`** : référence `CMD-XXXXXXXX`, lead, service (slug/titre
  dénormalisés), `optionIds` JSON, total, `deliveryDays`, devise **EUR**,
  `paymentProvider`, `paymentStatus` `CREATED`/`PAID`/`FAILED`/`REFUNDED`,
  `paypalOrderId` unique, `paypalCaptureId`, `payerEmail`, `payerName`, `paidAt`.

### Configuration

1. **Créer l'app** — [developer.paypal.com](https://developer.paypal.com) →
   *Applications & Credentials* → créer une app **REST API** (**sandbox** d'abord) →
   cocher les **scopes par défaut (checkout)**. ✓ Vous devez voir `Client ID` et
   `Secret` sandbox sur la fiche de l'app.

2. **Alimenter Vercel** (§3) : `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (sandbox),
   `PAYPAL_ENV=sandbox` → **Redeploy**.

3. **Tester en sandbox** — utiliser un **compte buyer sandbox** (*Sandbox* →
   *Accounts*) : choisir un service → remplir le formulaire → payer.
   ✓ Boutons PayPal visibles, puis confirmation avec la **référence `CMD-XXXXXXXX`** ;
   commande `PAID` en base et récapitulatif écrit dans la conversation du lead.

4. **Passer en live** — developer.paypal.com → *Live* → app **live** (clés
   distinctes des sandbox) → mettre à jour Vercel : clés **live** +
   `PAYPAL_ENV=live` → **Redeploy**.

5. **Test d'achat réel à faible montant** — ✓ Transaction visible dans le
   **dashboard PayPal** (compte marchand → *Activité*) et commande `PAID` avec
   `paypalCaptureId` renseigné.

> **Où voir les paiements :** dashboard PayPal du compte marchand (*Activité* /
> *Transactions*) ; côté plateforme, `paymentStatus` + référence `CMD-XXXXXXXX` en
> base. **Rappel :** sans clés PayPal, le site reste en **mode démo** (voie
> `POST /api/orders`, aucun paiement réel) — comportement par défaut.

---

## §6. Google Search Console

Socle SEO/GEO/AIO déjà en place : `sitemap.xml` **dynamique** (accueil, catalogue,
14 pôles, chaque service, blog, vendeurs), `robots.txt` (crawlers IA explicitement
autorisés : GPTBot, ClaudeBot, PerplexityBot…), `llms.txt`, JSON-LD partout,
canonicals par page.

1. **Ajouter la propriété** — [Google Search Console](https://search.google.com/search-console)
   → *Ajouter une propriété* → **Préfixe URL** → `https://b2bpro.store`.

2. **Méthode « Balise META »** — GSC affiche
   `<meta name="google-site-verification" content="…CODE…" />` → copier uniquement
   le **code** (valeur de `content`).

3. **Définir la variable Vercel** — `GOOGLE_SITE_VERIFICATION = CODE` (Production) →
   **Redeploy**. La balise est **déjà câblée** dans les métadonnées : rien à coder.
   ✓ Dans le source de `https://b2bpro.store`, la balise
   `<meta name="google-site-verification" content="CODE" />` apparaît dans le `<head>`.

4. **Vérifier** — GSC → cliquer **« Vérifier »**. ✓ *« Propriété vérifiée »*.

5. **Soumettre le sitemap** — GSC → *Sitemaps* → `https://b2bpro.store/sitemap.xml`
   → *Envoyer*. ✓ Statut « Réussi », pages découvertes > 0 (montée en charge
   progressive sur quelques jours).

6. **Suivi** — rapports GSC : **Performances** (requêtes, clics, position),
   **Couverture** (indexation), **Core Web Vitals**. La présence de `llms.txt` et des
   crawlers IA autorisés dans `robots.txt` prépare la citation par les IA génératives
   (GEO/AIO).

---

## §7. Vérifications post-déploiement (checklist)

À dérouler dans l'ordre après le dernier redéploiement — tous les points cochés
avant d'annoncer la mise en production :

| ✅ | # | Vérification | Résultat attendu |
|---|---|---|---|
| ☐ | 1 | `https://b2bpro.store/api/integrity` | HTTP **200**, `"ok": true` |
| ☐ | 2 | Accueil `https://b2bpro.store` | Page complète : catalogue, pôles, stats peuplées |
| ☐ | 3 | Une fiche service complète (`/services/<slug>`) | Description, options, avis, miniatures, tunnel de commande |
| ☐ | 4 | Tunnel PayPal **sandbox** (si clés définies) | Paiement buyer sandbox → confirmation `CMD-XXXXXXXX` |
| ☐ | 5 | Miniatures Blob dans le HTML d'une fiche | URLs `…public.blob.vercel-storage.com/thumbs/<slug>-1.webp` |
| ☐ | 6 | `https://b2bpro.store/sitemap.xml` | Sitemap XML complet (services, pôles, blog, vendeurs) |
| ☐ | 7 | `https://b2bpro.store/robots.txt` | Crawlers IA autorisés (GPTBot, ClaudeBot, PerplexityBot…) |
| ☐ | 8 | `https://b2bpro.store/llms.txt` | Sommaire de contenu pour IA |
| ☐ | 9 | Source de l'accueil | `<meta name="google-site-verification" content="…">` présente |
| ☐ | 10 | GSC | Propriété **vérifiée**, sitemap soumis (Réussi) |
| ☐ | 11 | Un paiement test (sandbox, puis live à faible montant) | Commande `PAID` + transaction dans le dashboard PayPal |
| ☐ | 12 | Guard local `bun run guard` | **14 contrôles verts** |

---

## §8. Exploitation & retour arrière

### Rollback d'un déploiement

- **Code** : Vercel → *Deployments* → ouvrir le **dernier déploiement sain** → menu ⋯
  → **Redeploy** (le domaine rebascule sur ce build, sans action Git). Pour un retour
  durable : `git revert` / checkout du tag sain, puis pousser.

### Données : sauvegarde / restauration

| Périmètre | Outil | Commande / accès |
|---|---|---|
| Base **locale** (SQLite) | Snapshot intégral | `bun run db:snapshot` (→ `db/snapshots/`, à committer) |
| Base **locale** (SQLite) | Restauration à l'identique | `bun run db:restore [fichier]` (IDs et slugs préservés) |
| Base **production** (Neon) | Branches / restore | Console Neon → *Branches* / *Restore* |

Réflexe : **snapshot local avant toute manipulation risquée** (charte §1).

### Rappels charte anti-régression applicables à la production

- `bun run guard` **avant ET après** toute évolution (14 contrôles — exit 1 si
  régression) ; `GET /api/integrity` branchable sur un monitoring d'uptime
  (HTTP 503 = alarme).
- Les schémas `prisma/schema.prisma` (SQLite) **et** `prisma/schema.postgres.prisma`
  (Postgres/Neon) évoluent **ensemble** — toute divergence casse le local ou la
  production. Après évolution : `bun run db:push` (local), `bun run db:push:pg` +
  `NEON_DATABASE_URL="…" bun run db:migrate:neon` (Neon), puis `bun run guard`.

### Ajout d'un service en production

1. Passer par le **skill rédactionnel obligatoire**
   `docs/SKILL-REDACTION-SEO-GEO-AIO.md` (skill `redaction-seo-geo-aio`) — aucune
   rédaction ne s'en affranchit (contrôles guard + `bun run audit:content`).
2. Créer les **3 miniatures SVG** (`public/thumbs/<slug>-{1,2,3}.svg`).
3. `bun run thumbs:blob --service=<slug>` pour téléverser les WebP du nouveau
   service (+ `--with-avatars` si nouveau vendeur/avatar).
4. `NEON_DATABASE_URL="…" bun run db:migrate:neon` (refresh complet idempotent).
5. `bun run guard` → 14 contrôles verts → vérifier la fiche en production.

---

## §9. FAQ / Dépannage

| Symptôme | Cause probable | Remède |
|---|---|---|
| **503** *« Paiement PayPal non configuré »* | `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` absents de Vercel (mode démo actif) ou non redéployés | Définir les deux variables (§5) puis **Redeploy** ; sans clés, la voie `POST /api/orders` reste le comportement par défaut |
| Fiches servant des **SVG locaux** au lieu du WebP Blob | Migration Blob non faite (`thumbUrls` absent → fallback SVG, aucune image cassée) | Exécuter `bun run thumbs:blob --with-avatars` (§4) |
| Erreur **P1001** Prisma (build / runtime Vercel) | `DATABASE_URL` absente ou invalide sur Vercel | Renseigner la chaîne Neon **« Pooled connection »** avec `sslmode=require` (§1.2 / §3) puis Redeploy |
| **Build Vercel échoue** sur `prisma generate` | `prisma/schema.postgres.prisma` désynchronisé de `prisma/schema.prisma`, ou `vercel.json` écrasé | Vérifier `vercel.json` (`bunx prisma generate --schema prisma/schema.postgres.prisma && next build`) ; répliquer l'évolution sur les **deux** schémas |
| **Divergence des comptes** en fin de `db:migrate:neon` (exit 1) | Copie annulée (ROLLBACK) — base locale modifiée pendant la migration ou cible inaccessible | Relancer la migration (idempotente, refresh complet) base locale au repos ; vérifier `NEON_DATABASE_URL` et l'état des tables Neon |
| GSC : *« Balise introuvable »* | `GOOGLE_SITE_VERIFICATION` ajoutée **après** le dernier déploiement | **Redeploy** (§6.3), vérifier la balise dans le source, puis re-cliquer « Vérifier » |
| *« commande PayPal déjà capturée »* / double clic | Capture rejouée — l'API est **idempotente** : la commande reste `PAID`, sans double encaissement | Comportement attendu : vérifier `PAID` + `paypalCaptureId` en base et la transaction unique côté PayPal |
| Images Blob **404 / refusées** par `next/image` | Domaine non autorisé dans `next.config.ts` | Le fichier autorise déjà `*.public.blob.vercel-storage.com` (`remotePatterns`) — vérifier qu'il n'a pas été modifié et redéployer |

---

### Commandes de référence

```bash
NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:migrate:neon  # copie intégrale SQLite → Neon
bun run db:push:pg           # crée/met à jour les tables Neon (schéma seul)
bun run db:generate:pg       # génère le client Prisma Postgres
bun run thumbs:blob          # miniatures SVG → WebP → Vercel Blob (idempotent)
bun run guard                # 14 contrôles d'intégrité — avant/après toute évolution
bun run db:snapshot          # sauvegarde intégrale de la base locale
bun run db:restore           # restauration à l'identique (IDs et slugs préservés)
```

---

*Runbook établi pour la stack de production Vercel · Neon · Blob · PayPal · GSC. Toute
évolution de la procédure doit rester cohérente avec `docs/REGRESSION-GUARD.md` et
être tracée dans `CHANGELOG.md`.*
