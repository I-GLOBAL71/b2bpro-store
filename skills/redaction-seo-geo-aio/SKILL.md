---
name: redaction-seo-geo-aio
description: >
  Skill rédactionnel obligatoire b2bpro.store — Méthode SGA™ (SEO + GEO + AIO).
  Se déclenche automatiquement pour TOUTE rédaction : fiche de service, article de blog,
  mise à jour de contenu. Garantit que chaque production passe la porte d'intégrité
  machine (bun run guard / bun run audit:seo) avant toute insertion en base.
triggers:
  - "rédige"
  - "écris"
  - "crée un article"
  - "nouvel article"
  - "nouveau service"
  - "ajoute un service"
  - "fiche service"
  - "article de blog"
  - "mise à jour"
  - "améliore le contenu"
  - "optimise"
  - "rewrite"
  - "contenu"
  - "blog"
  - "service"
---

# 📝 SKILL RÉDACTIONNEL OBLIGATOIRE — Méthode SGA™ (SEO + GEO + AIO)

> **CONTRAT b2bpro.store v1.9.0** — Ce skill est **auto-déclenché** pour toute
> rédaction (fiche service, article blog, mise à jour de contenu). Les standards
> ci-dessous sont vérifiés par machine (`bun run guard` — 19 contrôles, `bun run
> audit:content`, `bun run audit:seo`). Un contenu sous-standard est **REFUSÉ**.

---

## 🧠 Fondements scientifiques (pourquoi cette méthode)

Basé sur la synthèse des 5 meilleurs skills SEO/GEO/AIO open-source
(metawhisp/best-aeo-skill, aaron-he-zhu/seo-geo-claude-skills, amplifying-ai/awesome-GEO,
ClawHub seo-geo-optimizer, Clawic/seo) et sur les études scientifiques :

| Levier | Gain de citation IA |
|--------|---------------------|
| Citations de sources inline | **+115 %** (Princeton KDD 2024) |
| Citations d'autorité (quotes) | **+40 %** |
| Densité de statistiques | **+30-40 %** |
| Infrastructure (JSON-LD, llms.txt, H2, answer-first) | Surclasse la prose (C-SEO Bench 2025) |

**Objectif :** chaque service `/services/<slug>` et chaque article `/blog/<slug>`
doivent être **directement recommandés** par ChatGPT Search, Perplexity, Google AI
Overviews et positionnés en page 1 Google.

---

## 🔄 Pipeline obligatoire — 7 étapes AVANT toute insertion

### ÉTAPE 1 — SOURCER les mots-clés à fort trafic (non négociable)

**Pour une fiche de service :**
1. Identifier l'intention dominante de l'acheteur B2B francophone
2. Vérifier que le territoire sémantique n'est PAS déjà couvert (`data/gen/elite-keywords.ts`)
3. Mot-clé primaire : **tête commerciale 3-5 mots**, sous-chaîne du titre, requête plausible d'un acheteur
4. Enregistrer la preuve de sourçage dans `data/keyword-sources.json` (source + date)

**Pour un article de blog :**
1. Choisir un sujet à fort volume (≥ 500 req/mois estimé) lié à au moins un pôle de services
2. Vérifier l'absence d'article similaire en base (`bun run guard` → blog-slug-unique)
3. Identifier 3+ services de `/services/` à linker (maillage interne obligatoire)
4. Valider l'intention : informationnelle (top-funnel) ou commerciale (bas de funnel)

**Sources de mots-clés recommandées :**
- Google Suggest (saisie automatique) pour les variantes conversationnelles
- People Also Ask (PAA) → génère les aiQueries directement
- `data/keyword-sources.json` → vérifier les pools par pôle existants
- Script de recherche : `scripts/keyword-research.ts` (outil interne b2bpro.store)

---

### ÉTAPE 2 — Structure des mots-clés (champ `keywords`)

```json
{
  "primary": "mot-clé primaire 3-5 mots",
  "secondary": ["variante 1", "variante 2", "variante 3+"],
  "longTail": ["question longue traîne 1", "question 2", "question 3+"],
  "aiQueries": ["comment…?", "qu'est-ce que…?", "pourquoi…?"]
}
```

**Règles absolues :**
- `primary` : **unique entre toutes les fiches** (anti-cannibalisation) — vérifier dans `data/gen/elite-keywords.ts`
- `primary` : **sous-chaîne contiguë du titre** normalisé (minuscules, sans accents)
- `primary` : **présent dans les 250 premiers caractères** de la description (answer-first)
- `aiQueries` : formulées comme de vraies questions posées à une IA (style conversationnel)

---

### ÉTAPE 3A — Template SGA™ FICHE DE SERVICE (structure exacte)

```markdown
[Réponse-first] Primaire dans les 250 premiers car. + prix + délai + note + garantie.

## Pourquoi ce service est décisif pour votre entreprise
Enjeu chiffré. ≥ 1 fait liftable (nombre, stat, source).

## Ce que vous recevez concrètement
Pour X €… + liste ✓ (≥ 3 items).

## Votre avantage concurrentiel
Punchline + entités francophones (pays, villes, secteurs).

## Pourquoi commander ce service sur b2bpro.store ?
Garanties E-E-A-T chiffrées (délai, note, avis, escrow).
```

**Standards quantitatifs fiche service :**
| Champ | Standard | Vérifié par |
|-------|----------|-------------|
| `title` | 40–75 car. **+ contient le primaire** | guard + audit |
| `shortDesc` | 100–230 car. | guard + audit |
| `description` | ≥ 1000 car., ≥ 3 H2, ≥ 1 liste | guard + audit |
| `keywords.primary` | 3-5 mots, unique, sous-chaîne titre | guard × 2 + audit |
| `keywords.secondary` | ≥ 3 | audit |
| `keywords.longTail` | ≥ 3 | audit |
| `aiQueries` | ≥ 3 | guard + audit |
| `faq` | ≥ 4 Q/R, réponses ≥ 80 car., **1ère en « comment… »** | guard + audit + audit:seo |
| `features` | ≥ 4 | guard + audit |
| `deliverables` | ≥ 3 | guard + audit |
| `process` | ≥ 3 | guard + audit |
| Answer-first | primaire dans les 250 premiers car. | guard + audit |
| Densité | primaire ≥ 2 occurrences dans description | audit:seo (warn) |
| Hygiène | zéro cadratin (—), décimales à la virgule | audit:seo + guard |

---

### ÉTAPE 3B — Template SGA™ ARTICLE DE BLOG (structure exacte)

```markdown
---
title: "Titre ≤ 75 car. contenant le mot-clé principal"
slug: "slug-url-unique"
excerpt: "Résumé 80-200 car. répondant directement à la question principale."
category: "Catégorie du pôle concerné"
keywords: "mot-clé 1, mot-clé 2, longue traîne, question IA"
coverTheme: "theme-cover"
readMinutes: 8
author: "Rédaction b2bpro.store"
---

# Titre H1 identique au front-matter

**La réponse en 30 secondes :** [Bloc answer-first — répondre directement à l'intention
en 50-80 mots avec 1 chiffre citable et la promesse du contenu qui suit.]

## Sous-titre H2 n°1 — aspect principal

[Paragraphe avec ≥ 1 fait liftable chiffré. Citer une source si possible.]

## Sous-titre H2 n°2 — approfondissement

[Tableau comparatif OU liste numérotée pour citabilité IA maximale.]

## Sous-titre H2 n°3 — application pratique

[Cas concret francophone (France, Belgique, Cameroun, Sénégal…).]

## Nos services b2bpro.store pour aller plus loin

Découvrez [service lié](https://b2bpro.store/services/<slug-1>),
[service lié](https://b2bpro.store/services/<slug-2>),
[service lié](https://b2bpro.store/services/<slug-3>).
```

**Standards quantitatifs article blog :**
| Champ | Standard | Vérifié par |
|-------|----------|-------------|
| `title` | ≤ 75 car. (≤ 68 recommandé pour title tag) | guard + audit |
| `excerpt` | 80–200 car. | guard + audit |
| `content` | ≥ 1500 car. | guard + audit |
| H2 | ≥ 3 | guard + audit |
| Liens `/services/` | ≥ 3 liens absolus `https://b2bpro.store/services/…` | guard + audit |
| Slugs liés | **chaque slug doit exister en base** | add:blog (porte v2.0) |
| Cadratin | 0 (interdit) | guard + audit:seo |
| Nombre figé de services | INTERDIT (`\d{2,3} services`) | guard + audit |
| Answer-first | Réponse directe dans les 250 premiers car. | bonne pratique SGA |
| Faits liftables | ≥ 1 nombre/stat par H2 | bonne pratique SGA |

---

### ÉTAPE 4 — Les 4 Activateurs IA-citation (GEO, calibrés v1.7.0)

Vérifiables en production — **zéro travail manuel** si étapes 1-3 respectées :

**1. Réponse-first automatique** (`buildAnswerFirst()` dans `src/lib/site.ts`)
- Bloc « Réponse rapide » en haut de chaque fiche : 40-60 mots avec triplet **entité + prix + délai + note**
- Même paragraphe préfixe chaque fiche dans `llms-full.txt` (`RÉPONSE DIRECTE:`)
- **Conséquence :** le title, le primary keyword, le prix, le délai et la note DOIVENT être exacts

**2. Chiffres citables**
- Rangée de 4 stats visibles (prix / délai / note★ / ventes) sur chaque fiche
- Toute statistique dans la description DOIT être vérifiable (zéro invention)

**3. Liens directs**
- Chaque fiche expose son URL absolue (`Page officielle`)
- Articles de blog → section « Services concernés » (≤ 4 services du pôle, liens absolus)

**4. Question "comment…" en tête de FAQ**
- La 1ère question FAQ commence par « Comment… »
- Format repris en priorité par les assistants IA

---

### ÉTAPE 5 — Intégration technique

**Nouveau service :**
```bash
# 1. Ajouter la fiche dans data/catalog.json
# 2. Lancer le funnel humanisé :
bun run add:service -- --code=<code>
# → insertion base + 3 miniatures SVG (public/thumbs/<slug>-{1,2,3}.svg) + vendeur unique
```

**Nouvel article de blog :**
```bash
# 1. Créer data/blog/<slug>.md (respecter le template ÉTAPE 3B)
# 2. Vérifier que les 3+ slugs de services dans les liens existent en base
# 3. Lancer la porte de qualité :
bun run add:blog -- --slug=<slug>
# → validation bloquante AVANT insertion (exit 1 si non conforme)
```

**Mise à jour d'un article existant :**
```bash
# 1. Éditer data/blog/<slug>.md
bun run sync-blog
# → validation bloquante pré-écriture
```

---

### ÉTAPE 6 — Validation finale (porte de qualité — OBLIGATOIRE)

```bash
bun run audit:content   # audit individuel SEO/GEO/AIO service par service
bun run audit:seo       # scanner élite (passe profonde — cannibalisation, hygiène, liens)
bun run guard           # 19 contrôles bloquants
bun run lint            # qualité TypeScript/ESLint
```

**Échec = contenu REFUSÉ → corriger → revalider → tracer dans `CHANGELOG.md`.**

---

### ÉTAPE 7 — Recherche de mots-clés assistée (nouveaux articles/services)

Pour identifier des sujets à fort trafic longue traîne, utiliser :

```bash
# Script de recherche mots-clés intégré (Google Suggest + PAA + clustering)
bun run scripts/keyword-research.ts -- --query="votre sujet" --pole="nom-du-pole"
```

Le script génère :
- Top 30 suggestions Google Suggest (variantes conversationnelles)
- Top 10 questions PAA (→ aiQueries directes)
- Clustering sémantique par intention (informationnelle / commerciale / transactionnelle)
- Score KGR estimé (Keyword Golden Ratio pour la longue traîne)
- Vérification anti-cannibalisation avec le catalogue existant

---

## 🚫 Interdits absolus (violation = contenu refusé + rollback)

1. **Nombre figé de services** : compteurs dynamiques ou formulation ouverte uniquement
2. **Modifier un slug existant** : URL indexée = actif SEO protégé
3. **Prix/délai inventé** : hors catalogue → incohérence IA ↔ fiches
4. **Supprimer JSON-LD / llms.txt / robots.txt / méta** existants
5. **Statistiques non vérifiables** : rester factuel, chiffré, daté
6. **Contenu dupliqué** : intentions et bios uniques entre toutes les fiches
7. **Slug de service non vérifié** dans les liens internes d'un article de blog

---

## 📁 Références croisées

| Ressource | Rôle |
|-----------|------|
| `docs/SKILL-REDACTION-SEO-GEO-AIO.md` | Miroir documentaire versionnée de ce skill |
| `data/RECHERCHE_GITHUB_SEO_GEO_AIO.md` | Étude des 5 meilleurs skills open-source |
| `data/gen/elite-keywords.ts` | 113 mots-clés primaires curés (source de vérité) |
| `data/keyword-sources.json` | Preuves de sourçage par fiche |
| `data/catalog.json` | Catalogue des services (source d'ajout) |
| `data/blog/*.md` | Sources markdown des articles |
| `src/lib/site.ts` | `buildAnswerFirst()`, `extractPrimaryKeyword()` |
| `src/lib/guard.ts` | 19 contrôles d'intégrité machine |
| `scripts/audit-content.ts` | Audit individuel SEO/GEO/AIO |
| `scripts/audit-seo-geo-aio.ts` | Scanner élite (passe profonde) |
| `scripts/keyword-research.ts` | Recherche mots-clés assistée (Google Suggest + PAA) |
| `scripts/add-blog.ts` | Porte de qualité AVANT insertion article |
| `docs/REGRESSION-GUARD.md` | Charte anti-régression complète |

*Skill créé v2.0.0 le 2026-11-20 — synchronisé avec CONTRAT b2bpro.store v1.9.0.*
