# 📝 SKILL RÉDACTIONNEL OBLIGATOIRE — Méthode SGA™ (SEO + GEO + AIO)

> **CONTRAT b2bpro.store v1.2.0** — Ce document est le miroir versionné du skill
> `skills/redaction-seo-geo-aio/SKILL.md` (skill d'environnement auto-déclenché).
> Il est **rendu exécutable par machine** : les standards ci-dessous sont vérifiés par
> `bun run guard` (contrôles `services-content-standards` et `blog-content-standards`) et
> audités service par service par `bun run audit:content`.
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

`{ primary (3-5 mots), secondary (≥ 3), longTail (≥ 3), aiQueries (≥ 3 questions IA) }`

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
| title | 40–75 car. (voix « Je vais… ») | guard + audit |
| shortDesc | 100–230 car. | guard + audit |
| description | ≥ 1000 car., ≥ 3 H2, ≥ 1 liste | guard + audit |
| Answer-first | primaire dans les 250 premiers car. | guard + audit |
| keywords | primaire + ≥ 3 secondaires + ≥ 3 LT | guard + audit |
| aiQueries | ≥ 3 | guard + audit |
| faq | ≥ 4 Q/R, réponses ≥ 80 car. | guard + audit |
| features / deliverables / process | ≥ 4 / ≥ 3 / ≥ 3 | guard + audit |
| Preuve sociale | 4,2–5,0 ★, ventes > 0, avis > 0 | guard |
| Nombre figé de services | **INTERDIT** (dynamique ou formulation ouverte) | guard (blog) + skill |
| Blog : titre / extrait / contenu / H2 | ≤ 75 / 80–200 / ≥ 1500 / ≥ 3 | audit |

### ÉTAPE 5 — Intégration technique

- Nouveau service : `data/catalog.json` → pipeline `enrich.ts` (génère keywords, FAQ,
  description optimisée via `optimizeDescription()`) → insertion base → 3 miniatures SVG
  (`public/thumbs/<slug>-{1,2,3}.svg` via `data/gen/thumbs.ts`) → vendeur unique.
- Nouvel article : `data/blog/<slug>.md` + entrée BlogPost (slug unique, excerpt 80–200).
- Les templates de pages fournissent déjà metadata, JSON-LD, sitemap, llms.txt, answer-first —
  ne JAMAIS les dupliquer ni les retirer.

### ÉTAPE 6 — Validation finale (porte de qualité)

```bash
bun run audit:content   # audit individuel de chaque service et article
bun run guard           # 14 contrôles dont standards rédactionnels
bun run lint
```

Échec = contenu refusé → corriger → revalider → tracer dans `CHANGELOG.md`.

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
- Implémentation machine : `src/lib/guard.ts`, `scripts/audit-content.ts`
- Générateur : `data/gen/enrich.ts` (`optimizeDescription`, `buildKeywords`, `buildFaq`…)

*Contrat établi le 2026-11-08 (v1.2.0). Toute évolution de ce contrat suit le protocole
force majeure de la charte et doit rester synchronisée entre le skill, ce document et le
garde-fou.*
