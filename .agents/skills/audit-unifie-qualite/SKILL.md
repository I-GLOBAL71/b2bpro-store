---
name: audit-unifie-qualite
description: >-
  Porte de vérification qualité complète pour b2bpro.store (unifiée avec
  amens.store). Orchestre la sentinelle 22 contrôles (guard), les audits
  SEO/GEO/AIO, la notation blog Rang S+ (≥ 95/100), l'audit anti-traces IA et
  les tests de responsiveness mobile.
---

# Audit Unifié Qualité & Anti-Régression

Exécuter systématiquement après toute modification de contenu, composant ou route.

## Suite de validation complète

```bash
bun run audit:content
bun run audit:seo
bun run audit:blog
bun run scripts/audit-ai-traces.ts
bun test tests/blog-mobile.test.ts
bun run guard
bun run lint
```

## Seuils de validation

- **Rang S+ Blog (`audit:blog`)** : score ≥ 95/100 avec 0 échec critique (SEO 30 + GEO 25 + Zéro Trace IA 25 + CRO 10 + Visuels WebP/Blob CDN 10).
- **Anti-traces (`audit-ai-traces.ts`)** : 0 signature HAUT, 0 duplication transverse ≥ 4 fiches, 0 répétition inter-articles.
- **Garde d'intégrité (`guard`)** : 22/22 contrôles verts.
- **Mobile-first (`blog-mobile.test.ts`)** : 100 % vert, zéro débordement horizontal, blocs ``` tous fermés.
