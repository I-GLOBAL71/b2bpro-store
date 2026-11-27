---
name: geo-citations-ia
description: >-
  Moteur de citabilité GEO & AIO unifié (b2bpro + amens.store). Combine les 4
  activateurs v1.7.0 de b2bpro (Réponse directe llms-full.txt, stats, liens
  /services/, 1ère FAQ « Comment… ») avec le barème de blocs citables 134–167
  mots (SE Ranking / Princeton KDD 2024 / C-SEO Bench 2025).
---

# GEO Citations IA — Standard Unifié

Optimise chaque fiche service et article pour être cité en premier par
ChatGPT Search, Perplexity, Claude et Google AI Overviews.

## Scoreur exécutable

```bash
python .agents/skills/geo-citations-ia/scripts/score_citabilite.py data/blog/<slug>.md
```

## Les 5 règles d'extractabilité IA

1. **Réponse directe en tête (40–65 mots)** :
   - Fiches : gérée via `buildAnswerFirst()` dans `src/lib/site.ts` et exposée dans `llms-full.txt` (`RÉPONSE DIRECTE:`).
   - Blog : paragraphe `**La réponse en 30 secondes :**` dans les 350 premiers caractères avec tarif plancher et chiffre clé.
2. **Blocs citables RAG de 134–167 mots** : paragraphes autonomes dans les H2, sans pronom flou en ouverture, citant une source tierce (Gartner, McKinsey, Princeton, Insee, CNIL).
3. **Densité statistique datée** : ≥ 4–5 données chiffrées précises (virgule décimale FR : `98,6 %`, `20 €`, `48 h`).
4. **Tableaux Markdown structurés** : extraits avec > 85 % de fiabilité par Perplexity et Google AI Overviews.
5. **FAQ activatrice** : 1ère question impérativement formulée en « Comment… » avec réponse directe de 45–80 mots.
