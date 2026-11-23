# Règles d'Architecture et d'Excellence Mobile-First — b2bpro.store

## RÈGLE STRICTE ET PERMANENTE : 100 % Responsive & Mobile-Friendly sur Tout le Blog

### 1. Interdiction Absolue de Débordement Horizontal (Zero Horizontal Overflow)
- **Aucun élément** sur le site (pages de blog `/blog`, `/blog/[slug]`, fiches `/services`, accueil `/`, etc.) ne doit jamais dépasser la largeur de l'écran ou provoquer un défilement horizontal sur mobile (de 320px à 414px+).
- Le conteneur `<main id="contenu">` DOIT conserver systématiquement `w-full min-w-0 overflow-x-clip`.
- La balise `<article>` des articles de blog DOIT conserver systématiquement `w-full min-w-0 max-w-3xl`.
- Tout conteneur parent et wrapper intermédiaire de texte DOIT comporter `w-full min-w-0 max-w-full break-words`.

### 2. Standard Obligatoire pour le Composant Markdown (`src/components/site/markdown.tsx`)
- **Blocs de code (`pre` / `code`) :**
  - Tout bloc de code (avec ou sans langage spécifié) DOIT être enveloppé dans un conteneur défilable tactile (`overflow-x-auto touch-pan-x w-full min-w-0 max-w-full`).
  - Le code à l'intérieur ne doit JAMAIS imposer une largeur minimale au conteneur parent.
  - Le code inline (hors `pre`) DOIT comporter `break-words` ou `break-all` pour ne pas faire déborder l'écran si une chaîne technique ou un identifiant est long.
- **Tableaux GFM (`table`) :**
  - Tout tableau DOIT être enveloppé dans un conteneur tactile avec barre de défilement horizontal fluide (`overflow-x-auto touch-pan-x w-full min-w-0 max-w-full`).
  - Le `<table>` lui-même DOIT définir une largeur minimale (ex: `min-w-[560px]`) afin que les colonnes restent aérées et lisibles sans s'écraser sur 375px.
  - Un indicateur visuel (« Glisser horizontalement ↔ ») DOIT guider l'utilisateur mobile.
- **Titres et Paragraphes (`h1`, `h2`, `h3`, `p`, `blockquote`, `li`, `a`) :**
  - Tous les éléments de texte DOIVENT appliquer `break-words` et `overflow-wrap: anywhere` pour couper proprement les URLs ou termes techniques longs.
  - Tailles de police responsives adaptées aux petits écrans (ex: H1 en `text-2xl sm:text-3xl lg:text-4xl`).

### 3. Garde-Fou Automatisé et Invariants Anti-Régression
- La commande `bun run guard` intègre le contrôle invariant `blog-mobile-responsiveness` (vérification de `markdown.tsx`, `layout.tsx`, `[slug]/page.tsx` et de l'intégrité de tous les articles).
- Tout nouveau script ou publication d'article (`bun run add:blog`) vérifie automatiquement la fermeture des blocs de code et la validité du format.
- Aucun déploiement ni modification ne peut être validé sans le succès de `bun test tests/blog-mobile.test.ts` et `bun run guard`.
