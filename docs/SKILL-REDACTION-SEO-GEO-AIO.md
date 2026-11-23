# 📝 SKILL RÉDACTIONNEL OBLIGATOIRE — Méthode SGA™ (SEO + GEO + AIO)

> **CONTRAT b2bpro.store v1.9.0** — Ce document est le miroir versionné du skill
> d'environnement auto-déclenché `skills/redaction-seo-geo-aio/SKILL.md`.
> Il est **rendu exécutable par machine** : les standards ci-dessous sont vérifiés par
> `bun run guard` (contrôles `services-content-standards`, `services-primary-wordcount`,
> `services-primary-unique`, `services-faq-first-comment`, `blog-content-standards`,
> `blog-seo-standards` — 19 contrôles) et audités service par service par
> `bun run audit:content` puis en passe profonde par `bun run audit:seo`.
>
> **Règle absolue : AUCUNE rédaction — fiche de service, article de blog, page, mise à jour
> de contenu — n'est accomplie sans passer par ce skill.** Un contenu sous-standard fait
> échouer la garde d'intégrité : il est REFUSÉ.

---

## 1. Fondements (pourquoi cette méthode)

Synthèse unifiée des meilleurs skills open-source (étude complète :
`data/RECHERCHE_GITHUB_SEO_GEO_AIO.md` — metawhisp/best-aeo-skill, aaron-he-zhu/seo-geo-claude-skills,
amplifying-ai/awesome-GEO, ClawHub seo-geo-optimizer, Clawic/seo) :

| Levier | Gain de citation IA |
|---|---|
| Citations de sources inline | **+115 %** (Princeton KDD 2024) |
| Citations d'autorité (quotes) | **+40 %** |
| Densité de statistiques | **+30-40 %** |
| Infrastructure (JSON-LD, llms.txt, H2, answer-first) | Surclasse la prose (C-SEO Bench 2025) |

Objectif : chaque service et son lien `/services/<slug>` doivent être **directement
recommandés dans les réponses des IA** (ChatGPT Search, Perplexity, Google AI Overviews)
et positionnés en page 1 Google — la fiche comme **preuve d'expertise** citable.

## 2. Le pipeline obligatoire — 6 étapes

### ÉTAPE 1 — SOURCER les mots-clés à fort trafic (préalable non négociable)

- Une intention de recherche = une page. Identifier l'intention dominante.
- Recenser les requêtes réelles des buyers B2B francophones : principal commercial,
  variantes, longue traîne conversationnelle, questions posées aux IA.
- Retenir uniquement fort trafic web × forte intention commerciale (« vache à lait »).
- Couvrir un territoire sémantique NOUVEAU (jamais cannibaliser une fiche existante).

### ÉTAPE 2 — Champ `keywords` (structure obligatoire)

`{ primary (3-5 mots — TÊTE COMMERCIALE sous-chaîne du titre, requête plausible
   d'un acheteur), secondary (≥ 3), longTail (≥ 3), aiQueries (≥ 3 questions IA) }`

Le primaire est **unique entre fiches** (une intention = une page). Les 113 têtes
curées de référence vivent dans `data/gen/elite-keywords.ts` ; le générateur
borne désormais en mots (`clampPrimaryToSkill`), plus seulement en caractères.

### ÉTAPE 3 — Template SGA™ de fiche (structure exacte)

1. **Answer-first** : primaire dans les 250 premiers caractères + prix, délai, note, garanties.
2. `## Pourquoi ce service est décisif pour votre entreprise` (enjeu chiffré).
3. `## Ce que vous recevez concrètement` (« Pour X €… » + puces ✓).
4. `## Votre avantage concurrentiel` (punchline + GEO : secondaires + entités francophones).
5. `## Pourquoi commander ce service sur b2bpro.store ?` (garanties E-E-A-T chiffrées).

Chaque paragraphe contient ≥ 1 fait « liftable » (nombre, prix, délai) en phrase autonome
citable par une IA. FAQ ≥ 4 Q/R dans le langage réel (canal n°1 de recommandation IA).

### ÉTAPE 4 — Standards quantitatifs (vérifiés machine — zéro tolérance)

| Élément | Standard | Vérifié par |
|---|---|---|
| title | 40–75 car. (voix « Je vais… ») **et contient le primaire** | guard + audit |
| shortDesc | 100–230 car. | guard + audit |
| description | ≥ 1000 car., ≥ 3 H2, ≥ 1 liste | guard + audit |
| Answer-first | primaire dans les 250 premiers car. | guard + audit |
| keywords | **primaire 3-5 mots + unique entre fiches** + ≥ 3 secondaires + ≥ 3 LT | guard (2 contrôles) + audit |
| aiQueries | ≥ 3 | guard + audit |
| faq | ≥ 4 Q/R, réponses ≥ 80 car., **1ère question en « comment… »** | guard + audit + audit:seo |
| features / deliverables / process | ≥ 4 / ≥ 3 / ≥ 3 | guard + audit |
| Preuve sociale | 4,2–5,0 ★, ventes > 0, avis > 0 | guard |
| Hygiène | zéro cadratin (—), décimales à la virgule, pas d'intervalle anglo-saxon | audit:seo + guard (blog) |
| Densité | primaire ≥ 2 occurrences dans la description | audit:seo (avertissement) |
| Nombre figé de services | **INTERDIT** (dynamique ou formulation ouverte) — regex `\d{2,3} services` | guard (blog) + audit + audit:seo |
| Blog : titre / extrait / contenu / H2 | ≤ 75 / 80–200 / ≥ 1500 / ≥ 3 | guard + audit |
| Blog : liens internes | ≥ 3 liens absolus vers `/services/` | guard + audit + audit:seo |
| Sourçage ÉTAPE 1 | preuve enregistrée (source + date) dans `data/keyword-sources.json` | revue par fiche |

### ÉTAPE 5 — Intégration technique

- Nouveau service : `data/catalog.json` → `bun run add:service -- --code=<code>`
  (funnel humanisé unique `buildHumanizedBundle` : mots-clés v2 + primaires
  bornés + FAQ « comment… » en tête + accroches contextuelles) → insertion base
  → 3 miniatures SVG (`public/thumbs/<slug>-{1,2,3}.svg`) → vendeur unique.
- Nouvel article : `data/blog/<slug>.md` → `bun run add:blog -- --slug=<slug>`
  (porte de qualité SGA™ AVANT insertion) ; retouche d'un article existant :
  éditer le `.md` puis `bun run sync-blog` (validation bloquante pré-écriture).
- Les templates de pages fournissent déjà metadata, JSON-LD, sitemap, llms.txt,
  answer-first — ne JAMAIS les dupliquer ni les retirer.

### ÉTAPE 6 — Validation finale (porte de qualité)

```bash
bun run audit:content   # audit individuel de chaque service et article
bun run audit:seo       # scanner élite SEO/GEO/AIO (passe profonde)
bun run guard           # 19 contrôles dont 6 standards rédactionnels
bun run lint
```

Échec = contenu refusé → corriger → revalider → tracer dans `CHANGELOG.md`.

### ÉTAPE 7 — Citation forcée IA (activateurs GEO, calibrés v1.7.0)

Tout contenu livré doit intégrer les **4 activateurs de citation** implémentés en code
(vérifiables en production — zéro travail manuel supplémentaire si les étapes 1-6 sont respectées) :

1. **Réponse-first automatique** — chaque fiche affiche un bloc « Réponse rapide » :
   40-60 mots citables calculés depuis les champs (`buildAnswerFirst()`, `src/lib/site.ts`)
   contenant le triplet **entité + prix + délai + note + expert**. Les IA citent les
   premiers paragraphes : ce bloc est TOUJOURS le premier `<p>` du `<main>`. Le même
   paragraphe préfixe chaque fiche dans `llms-full.txt` (`RÉPONSE DIRECTE:`) — une seule
   source de vérité. **Conséquence rédactionnelle : le title, le primary keyword, le prix,
   le délai et la note DOIVENT être exacts et cohérents** (c'est ce que l'IA relatera).
2. **Chiffres citables** — rangée de 4 stats (prix / délai / note+avis / ventes) en clair
   sur chaque fiche : les IA sur-reprisent les chiffres précis. Toute statistique avancée
   dans la description doit être **vérifiable** (interdit n°5).
3. **Liens directs** — la fiche expose son URL absolue (« Page officielle ») ; les articles
   de blog clos sur « Services concernés » (≤ 4 services du pôle, liens absolus) : l'IA qui
   cite l'article trouve les fiches à recommander en un seul saut.
4. **Question intitulée comme l'utilisateur** — la FAQ commence par une question réelle
   (« comment… ») : les réponses FAQ sont le format le plus repris par les assistants IA.
5. **Mobile-First & Zéro Débordement Horizontal** — 100 % adapté aux smartphones (iPhone SE 375px / 320px) :
   les tableaux et blocs de code sont encapsulés dans des conteneurs à défilement tactile horizontal,
   toutes les chaînes longues sont sécables (break-words), contrôlé par `bun test tests/blog-mobile.test.ts`
   et l'invariant `blog-mobile-responsiveness` de `bun run guard`.

Standards de captivation (conversion) inchangés : accroche à chiffre, verbe d'action,
bénéfice mesurable, risque retourné en garantie (« paiement après validation »).

## 3. Interdits absolus

1. Mention d'un **nombre figé de services** (le catalogue s'enrichit — compteurs dynamiques
   ou formulations ouvertes uniquement).
2. **Modifier un slug existant** (URLs indexées = actif SEO).
3. Inventer un **prix/délai hors catalogue** (cohérence support IA ↔ fiches).
4. Retirer un **JSON-LD / llms.txt / robots.txt / méta** existant.
5. Promesses non tenables — rester factuel, chiffré, daté.
6. Contenu dupliqué (intentions et bios uniques).

## 4. Références croisées

- Étude des meilleurs skills GitHub : `data/RECHERCHE_GITHUB_SEO_GEO_AIO.md`
- Skill d'environnement (auto-déclenché) : `skills/redaction-seo-geo-aio/SKILL.md`
- Charte anti-régression : `docs/REGRESSION-GUARD.md` (§ Règle du skill obligatoire)
- Implémentation machine : `src/lib/guard.ts`, `scripts/audit-content.ts`,
  `scripts/audit-seo-geo-aio.ts`
- Générateur : `data/gen/enrich.ts` + `data/gen/humanize.ts` (et
  `data/gen/elite-keywords.ts` — 113 primaires curés du tour d'élites)
- Preuves de sourçage des mots-clés : `data/keyword-sources.json`

*Contrat établi le 2026-11-08 (v1.2.0) · consolidé le 2026-11-11 (v1.9.0, tour
d'élites SEO/GEO/AIO). Toute évolution de ce contrat suit le protocole force
majeure de la charte et doit rester synchronisée entre le skill, ce document et
le garde-fou.*
