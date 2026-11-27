---
name: redaction-seo-geo-aio
description: >-
  Skill rédactionnel unifié obligatoire b2bpro.store (v3.0 — Méthode SGA™ +
  Blue Ocean + Zéro Trace d'IA). Se déclenche automatiquement pour TOUTE rédaction :
  fiche de service, article de blog, mise à jour de contenu. Garantit la
  qualification mots-clés, les blocs RAG 134–167 mots, l'humanisation 6 passes,
  l'hygiène Unicode Couche A, le responsive mobile et la porte d'intégrité
  machine (bun run guard / audit:content / audit:seo / audit:blog) avant insertion.
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

# 📝 SKILL RÉDACTIONNEL UNIFIÉ — Méthode SGA™ v3.0 (SEO + GEO + AIO + Blue Ocean)

> **CONTRAT b2bpro.store v3.0 (Unifié avec amens.store)** — Ce skill est
> **auto-déclenché** pour toute rédaction (fiche service, article blog, mise à
> jour). Les standards ci-dessous sont vérifiés par machine (`bun run guard` —
> 22 contrôles, `bun run audit:content`, `bun run audit:seo`, `bun run audit:blog`,
> `bun test tests/blog-mobile.test.ts`). Un contenu sous-standard est **REFUSÉ**.

---

## 🧠 Fondements scientifiques unifiés

Synthèse des meilleurs skills open-source et études (Princeton KDD 2024,
C-SEO Bench 2025, AutoGEO ICLR 2026, SE Ranking 1,3 M citations, Google Search Central 2026) :

| Levier | Gain mesuré | Application machine |
|---|---|---|
| Citations de sources inline | **+115 %** | ≥ 1 source d'autorité (Gartner, McKinsey, Insee, CNIL…) |
| Answer-first 40–60 mots en tête | Surclasse la prose | Primaire dans 250 premiers car. + `**La réponse en 30 secondes :**` |
| Blocs RAG auto-suffisants (134–167 mots) | Citation directe LLM | Paragraphes autonomes sans pronom flou en ouverture |
| Densité statistique datée | **+30–40 %** | ≥ 4–5 chiffres/unités précis datés par section |
| Infrastructure & FAQ « Comment… » | Taux extraction > 85 % | Tableau Markdown + JSON-LD + 1ère FAQ en « Comment… » |

---

## 🔄 Pipeline unifié en 7 étapes AVANT toute insertion

### ÉTAPE 1 — Qualification Blue Ocean + SGA™ (zéro cannibalisation)
- **Fiche de service** : identifier l'intention commerciale B2B francophone ; vérifier l'unicité dans `data/gen/elite-keywords.ts` ; choisir un primaire **3–5 mots significatifs**, sous-chaîne contiguë du titre ; enregistrer la preuve dans `data/keyword-sources.json`.
- **Article de blog** : cibler un sujet fort volume / faible concurrence (filtre 2/3 : KD faible, résistance AIO forte, potentiel commercial fort), sans cannibaliser les fiches existantes, avec **≥ 3 liens absolus** vers des slugs vérifiés de `https://b2bpro.store/services/<slug>`.
- **Outils** : `bun run research:kw -- --query="votre sujet" --pole="nom-du-pole"` (et skill `blueocean-keywords` pour le scoring multi-pays `fr,ci,cm,sn`).

### ÉTAPE 2 — Structure des mots-clés (`keywords`)
```json
{
  "primary": "mot-clé primaire 3-5 mots",
  "secondary": ["variante 1", "variante 2", "variante 3+"],
  "longTail": ["question longue traîne 1", "question 2", "question 3+"],
  "aiQueries": ["comment…?", "qu'est-ce que…?", "pourquoi…?"]
}
```
Couvrir les **5 axes Query Fan-Out** (éligibilité, coût/rentabilité, processus/délai, spécifications/zone francophone, variantes).

### ÉTAPE 3A — Template SGA™ FICHE DE SERVICE
1. `[Answer-first]` Primaire dans les 250 premiers car. + prix + délai + note + garantie séquestre.
2. `## Pourquoi ce service est décisif pour votre entreprise` (enjeu chiffré + fait liftable).
3. `## Ce que vous recevez concrètement` (`Pour X €…` + puces `✓` ≥ 3 items).
4. `## Votre avantage concurrentiel` (entités francophones + différenciation).
5. `## Pourquoi commander ce service sur b2bpro.store ?` (garanties E-E-A-T, escrow).

**Seuils machine fiche** : `title` 40–75 car. + primaire ancré · `shortDesc` 100–230 car. · `description` ≥ 1000 car., ≥ 3 H2, ≥ 1 liste · `faq` ≥ 4 Q/R (réponses ≥ 80 car., **1ère en « Comment… »**) · `features` ≥ 4 · `deliverables` ≥ 3 · `process` ≥ 3.

### ÉTAPE 3B — Template SGA™ ARTICLE DE BLOG (Rang S+ ≥ 95/100)
```markdown
---
title: "Titre 40–75 car. contenant le mot-clé principal (front-loaded)"
slug: "slug-url-unique"
excerpt: "Résumé 80-200 car. répondant directement à la question principale."
category: "Catégorie du pôle concerné"
keywords: "mot-clé primaire, variante 1, longue traîne, question IA"
coverTheme: "theme-cover"
readMinutes: 8
author: "Rédaction b2bpro.store"
---

# Titre H1 identique au front-matter

**La réponse en 30 secondes :** [Bloc answer-first 45-65 mots avec 1 chiffre citable, ancrage tarifaire (ex: dès 20 €) et promesse claire.]

## Sous-titre H2 n°1 — aspect principal
[Bloc citable RAG de 134–167 mots auto-suffisant, source d'autorité et statistiques datées.]

## Sous-titre H2 n°2 — tableau comparatif & métriques
[Tableau Markdown structuré ≥ 3 colonnes + analyse chiffrée.]

## Sous-titre H2 n°3 — application terrain & sécurisation
[Retour concret francophone + rassurance paiement sous séquestre.]

## Foire aux questions
### Comment [question d'ouverture obligatoire en « Comment… »] ?
[Réponse directe 45–70 mots.]

## Nos services b2bpro.store pour aller plus loin
Découvrez [service 1](https://b2bpro.store/services/<slug-1>), [service 2](https://b2bpro.store/services/<slug-2>), [service 3](https://b2bpro.store/services/<slug-3>).
```

### ÉTAPE 4 — Humanisation 6 passes & Hygiène Couche A (Zéro Trace d'IA)
- **0 tiret cadratin (`—`)** : remplacer par virgule, parenthèse ou deux-points (bloquant `guard` & `audit:seo`).
- **0 marqueur lexical IA** : bannir *plongeons au cœur de*, *dans un monde en constante évolution*, *force est de constater*, *il convient de noter*, *en conclusion / en somme*, *non seulement… mais aussi*, *holistique / mosaïque / tapisserie / sans couture / catalyseur*, anglicismes (*delve, leverage, foster, streamline*) et auto-proclamations (*100 % humain*, *rédigé sans IA*).
- **Burstiness élevée** : alterner phrases courtes (≤ 8 mots, au moins 2 par article) et développements analytiques (écart-type ≥ 5,0).
- **Hygiène typographique & Unicode** : décimales à la virgule (`98,6 %`), 0 espace insécable/invisible (`\u200B`, `\uFEFF`, bidi, homoglyphes), 0 phrase répétée d'une fiche ou d'un article à l'autre.

### ÉTAPE 5 — Sécurité Mobile-First & Visuels WebP
- Fermer impérativement tous les blocs de code ```` ``` ```` (parité stricte requise par `blog-mobile-responsiveness` et `tests/blog-mobile.test.ts`).
- Garantir le visuel WebP 1200×630 (< 80 Ko) sur disque + CDN Vercel Blob (`manifest.json`).

### ÉTAPE 6 — Intégration & Porte de Qualité Machine (Rang S+ requis)
```bash
bun run add:blog -- --slug=<slug>      # ou sync-blog / add:service
bun run audit:content                  # standards individuels SEO/GEO/AIO
bun run audit:seo                      # scanner élite (cannibalisation, hygiène, llms.txt)
bun run audit:blog                     # notation 5 piliers (Rang S+ ≥ 95/100)
bun test tests/blog-mobile.test.ts     # zéro débordement mobile
bun run guard                          # 22 contrôles bloquants
bun run lint                           # TypeScript / ESLint
```

## 🚫 Interdits absolus
1. Nombre figé de services (`\d{2,3} services`).
2. Modifier un slug existant.
3. Prix/délai hors catalogue ou statistique inventée.
4. Retirer JSON-LD / `llms.txt` / `robots.txt` / méta.
5. Contenu dupliqué ou slug `/services/` non vérifié en base.
6. Tiret cadratin `—`, marqueur IA, ou bloc de code non fermé.
