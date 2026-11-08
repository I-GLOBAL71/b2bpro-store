# 🛡️ CHARTE ANTI-RÉGRESSION — b2bpro.store

> **Objet :** protéger le code, les données et le SEO de la plateforme contre toute
> régression ou cassure lors des prochaines implémentations.
>
> **Principe directeur :** toute nouvelle fonctionnalité s'ajoute **sans modifier ni
> casser l'existant**. La modification d'une implémentation existante n'est admise
> qu'en **cas de force majeure** — c'est-à-dire lorsque la nouvelle fonctionnalité
> ne peut techniquement pas voir le jour sans — et selon le protocole du §5.

---

## 1. Les lignes de défense (outils en place)

| # | Ligne de défense | Outil | Quand l'utiliser |
|---|---|---|---|
| 1 | **Contrats typés** | `src/lib/contracts.ts` — types DTO, schémas Zod des API, constantes `API_ROUTES`, invariants `BUSINESS_RULES` | Importer depuis là ; ne jamais redéclarer un type, un schéma ou une URL d'API ailleurs |
| 2 | **Garde d'intégrité** | `bun run guard` (12 contrôles) et `GET /api/integrity` (HTTP 503 = alarme) | **Avant ET après** chaque implémentation, avant chaque commit |
| 3 | **Snapshots de données** | `bun run db:snapshot` → `db/snapshots/*.json` (committés) | Avant toute manipulation de données, migration, ou implémentation risquée |
| 4 | **Restauration** | `bun run db:restore [fichier]` | Après incident ou manipulation erronée (reconstruit la base à l'identique, IDs et slugs préservés) |
| 5 | **Frontières d'erreur** | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Déjà actives — une page cassée n'affiche jamais un écran blanc, le site reste navigable |
| 6 | **Lint** | `bun run lint` | Avant chaque commit (doit rester sans erreur ni warning nouveau) |
| 7 | **Versionnement Git** | Commits atomiques par fonctionnalité + **tags** (`v1.0.0-baseline`, …) | Tag avant toute opération risquée ; un tag = point de retour immédiat |
| 8 | **Journal des changements** | `CHANGELOG.md` (types `[ADDITIF]`, `[FORCE MAJEURE]`, `[DONNÉES]`, `[CORRECTIF]`) | À chaque implémentation, sans exception |
| 9 | **Reproductibilité des données de référence** | `data/seed.ts` + `data/catalog.json` | La base de démo se reconstruit à l'identique ; **ne jamais casser le seed** |

---

## 2. Cartographie des zones protégées

### 🔴 Noyau vital — ne JAMAIS modifier hors protocole force majeure

| Fichier / dossier | Rôle | Pourquoi c'est vital |
|---|---|---|
| `prisma/schema.prisma` | Schéma de données | Toute rupture de colonne/relation casse **toutes** les pages et le seed |
| `src/lib/db.ts` | Client Prisma partagé | Point d'accès unique à la base |
| `src/lib/queries.ts` | Toutes les requêtes de lecture | Consommées par toutes les pages ; changer un retour = casser les pages |
| `src/lib/contracts.ts` | Contrats types + Zod + constantes | Le langage commun de toutes les implémentations |
| `src/lib/guard.ts` | Moteur d'invariants | Il est lui-même la protection — le relâcher détruit la détection de régression |
| `src/lib/site.ts` | Identité, pôles, formats | `POLE_LABELS`/`POLE_ACCENTS` indexent les couleurs et libellés de 14 pôles |
| `src/app/layout.tsx` | Layout racine (header/footer/SEO global) | Structure et JSON-LD Organisation de tout le site |
| `src/app/sitemap.ts`, `robots.ts`, `llms.txt/route.ts` | SEO/GEO/AIO technique | Le référencement et la citation par les IA en dépendent |
| `data/seed.ts`, `data/catalog.json`, `data/gen/*` | Reproductibilité de la base | Sans eux, la base n'est plus reconstruisible |

### 🟠 Pages et endpoints à contrat public — extensions additives uniquement

| Ressource | Contrat public exposé |
|---|---|
| `/` (`src/app/page.tsx`) | Page d'accueil (seule route visible par défaut) |
| `/services` + `/services/[slug]` | **URLs indexées par les moteurs** — slugs = actif SEO, ne jamais les changer |
| `/categories/[slug]`, `/vendeurs/[slug]`, `/blog/[slug]` | URLs indexées idem |
| `POST /api/orders` | Corps : `orderRequestSchema` (contracts.ts) — validation et recalcul serveur du total |
| `POST /api/reviews` | Corps : `reviewRequestSchema` — recalcule la moyenne du service |
| `POST /api/leads` | Corps : `leadRequestSchema` — upsert email (gate du support IA) |
| `POST /api/support/chat` | Corps : `chatRequestSchema` — RAG (KB + services) puis LLM ; **email obligatoire avant toute itération** |
| `GET /api/services` | Réponse : `ServicesApiResponse` (consommable par des intégrations externes) |
| `GET /api/integrity` | Rapport d'intégrité — monitoring possible (503 = alarme) |

### 🟡 Composants structurants — extension par props additionnelles avec défauts

`site-header`, `site-footer`, `service-card`, `option-selector` (upsell ComeUp),
`service-gallery` (3 miniatures), `review-form`, `support-chat` (gate email),
`rating-stars`, `markdown`, `pole-icon`, composants `home/*`.

### 🟢 Terrains d'extension libres

- **Nouveaux fichiers** : nouveaux composants, nouvelles routes API, nouvelles pages,
  nouveaux scripts — sous réserve de respecter les conventions ci-dessous.
- **Nouvelles données** : nouveaux services (via `data/`), nouvelles entrées de
  connaissances, nouveaux articles de blog — le garde-fou valide automatiquement
  leur conformité aux invariants du §7.

---

## 3. Règles d'or pour toute nouvelle implémentation

**Avant de coder :**
1. `bun run guard` → doit être **vert** (sinon : corriger d'abord l'existant).
2. `bun run db:snapshot` si l'implémentation touche aux données ou au schéma.
3. Lire `src/lib/contracts.ts` et **réutiliser** types/schémas/`API_ROUTES`/`BUSINESS_RULES`.
4. Identifier la zone : ai-je besoin de *modifier* du 🔴/🟠/🟡 ? Si oui → protocole §5.

**En codant :**
5. Privilégier la **création de nouveaux fichiers** à la modification des existants.
6. Toute nouvelle route API doit valider son entrée avec un schéma Zod (ajouté dans
   `contracts.ts`) et répondre au format `{ ok: true, … }` / `{ error: string }`.
7. Toute nouvelle page dynamique doit définir `generateMetadata` + JSON-LD
   (cohérence SEO/GEO/AIO du reste du site) et passer par `src/lib/queries.ts`.
8. Jamais de requête SQL/Prisma directe dispersée : centraliser dans `queries.ts`
   (fonctions **nouvelles**, sans toucher aux existantes).

**Après codage :**
9. `bun run guard` → vert ; `bun run lint` → sans nouvelle erreur.
10. Vérifier dans le navigateur : la nouvelle fonctionnalité **ET** les parcours
    existants (accueil → service → commander ; support IA → email → réponse).
11. `CHANGELOG.md` : documenter (type, fichiers touchés, justification).
12. Commit atomique + si jalon : tag.

---

## 4. Règles d'évolution par domaine

### Prisma / base de données
- ✅ **Ajouter** un modèle, un champ **optionnel** (`?`) ou avec `@default`.
- ✅ Ajouter un index.
- ❌ Renommer/retirer un champ ou un modèle → passer par force majeure
  (double colonne + rétro-compatibilité pendant une itération, puis nettoyage tracé).
- ⚠️ `db:push --accept-data-loss` : interdit hors snapshot préalable vérifié.
- Les champs listes restent des **JSON stringifiés** (contrainte SQLite du projet) :
  les lire via `safeJsonParse` (contracts.ts) dans tout nouveau code.

### Routes API
- ✅ Ajouter un endpoint ; ajouter un champ **de réponse** (les clients l'ignorent).
- ✅ Ajouter un paramètre de requête **optionnel**.
- ❌ Retirer/renommer un champ existant d'une réponse ou d'un corps accepté.
- ❌ Changer un code de statut existant (200/400/404/500/503 sont un contrat).

### Composants UI
- ✅ Ajouter une prop **optionnelle avec valeur par défaut**.
- ✅ Créer un nouveau composant (même dossier, même convention de nommage).
- ❌ Retirer une prop existante, changer son type, ou renommer un composant utilisé.

### SEO / GEO / AIO
- ❌ **Ne jamais changer un slug existant** (`/services/…`, `/blog/…`) : ce sont des
  URLs indexées. Un déplacement = redirection permanente documentée en force majeure.
- ❌ Ne pas retirer les JSON-LD existants (Service, Product, FAQPage, BreadcrumbList,
  Organization) ni `llms.txt` / `sitemap` / `robots`.
- ✅ Tout nouveau contenu éditorial suit le **skill SEO/GEO/AIO unifié**
  (`data/RECHERCHE_GITHUB_SEO_GEO_AIO.md`) : mots-clés à fort trafic sourcés,
  structuration answer-first, FAQ citable.

---

## 5. Protocole force majeure

La modification d'une implémentation existante n'est légitime que si **la nouvelle
fonctionnalité ne peut techniquement pas exister autrement**. Étapes obligatoires :

1. **Justifier** dans `CHANGELOG.md` : pourquoi aucune approche additive n'était possible.
2. **Snapshot + tag Git** préalables (`bun run db:snapshot`, `git tag pre-<feature>`).
3. **Analyse d'impact** : lister tout ce qui dépend de l'élément modifié (recherche
   d'imports/usages), et vérifier chaque consommateur.
4. **Compatibilité** : si une signature change, conserver un alias/rétro-compatibilité
   déprécié le temps d'une itération (marqué `@deprecated` + note CHANGELOG).
5. **Vérification complète** : `guard` vert, `lint` propre, parcours navigateur
   (accueil, service, commande, support IA) fonctionnels.
6. **Traçage** : entrée `[FORCE MAJEURE]` dans `CHANGELOG.md` avec fichiers et motif.

---

## 6. Invariants métier (cahier des charges — vérifiés par le garde-fou)

- **3 miniatures** exactement par service (`public/thumbs/<slug>-{1,2,3}.svg`, non vides).
- Notes des services et vendeurs dans l'intervalle **4,2 – 5,0**.
- **Bios des vendeurs uniques** (aucune description dupliquée) — vendeurs fictifs
  FR / CA / AF aux profils tous distincts.
- Avis : notes 1–5, auteur et commentaire présents ; service résolu.
- Options additionnelles : montants ≥ 0, parent résolu, IDs uniques.
- Base de connaissances IA **non vide**, réponses substantielles avec mots-clés.
- Email capturé **avant** toute itération avec le support IA (contrat `/api/support/chat`).
- Slugs uniques partout (services, vendeurs, blog) — URLs = actif SEO.
- Champs JSON valides (`keywords`, `faq`, `features`, `deliverables`, `process`,
  `skills`, `languages`).
- Fichiers critiques du code présents (36 fichiers vitaux surveillés).
- Preuve sociale : compteur de services réalisés > 0, note moyenne dans les bornes.

---

## 7. Commandes de référence

```bash
bun run guard          # Garde d'intégrité complète (exit 1 si régression)
bun run db:snapshot    # Sauvegarde totale de la base (à committer)
bun run db:restore     # Restaure la dernière sauvegarde (ou un fichier donné)
bun run lint           # Qualité du code
bun run db:push        # Applique le schéma Prisma (jamais sans snapshot avant)
bun run data/seed.ts   # (si besoin) Régénère la base de démonstration
```

Suivi live : `GET /api/integrity` → `{ ok, checks[], counts }` (503 si échec).

---

*Charte établie le 2026-11-08 — version 1.0.0 du socle contractuel. Toute évolution de
la présente charte est elle-même soumise au protocole force majeure.*
