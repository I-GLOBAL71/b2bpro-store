---
name: humanisation-traces-ia
description: >-
  Moteur unifié d'humanisation et suppression des traces IA (b2bpro
  audit-ai-traces + amens.store humanisation-100 & suppression-traces-ia).
  Couvre les 6 passes rédactionnelles, la purge des 120+ marqueurs IA, zéro
  tiret cadratin, burstiness élevée (écart-type ≥ 5,0), zéro répétition
  inter-fiches/articles et nettoyage déterministe Unicode Couche A.
---

# Humanisation 100 % & Suppression Traces IA

Unifie l'audit transverse `b2bpro` (`scripts/audit-ai-traces.ts`) et le protocole
en 6 passes + Couche A `amens.store`.

## Commandes de contrôle

```bash
bun run scripts/audit-ai-traces.ts
bun run audit:blog
python .agents/skills/humanisation-traces-ia/scripts/analyse_style.py data/blog/<slug>.md
python .agents/skills/humanisation-traces-ia/scripts/nettoyer_unicode.py data/blog/<slug>.md --inspecter
```

## Critères zéro tolérance

1. **Zéro trace technique Unicode (Couche A)** : aucun `\u200B-\u200F`, `\u00AD`, `\uFEFF`, tag Unicode `\U000E0000-\U000E007F`, ni homoglyphe cyrillique/grec.
2. **Zéro tiret cadratin (`—`)** : remplacer par virgule, parenthèse ou deux-points.
3. **Zéro tic lexical IA** : bannir *dans un monde en constante évolution*, *plongeons au cœur de*, *force est de constater*, *il convient de noter*, *en conclusion / en somme*, *non seulement… mais aussi*, *holistique / mosaïque / tapisserie / sans couture / catalyseur*, anglicismes (*delve, leverage, foster, streamline*) et auto-proclamations (*100 % humain*, *rédigé sans IA*).
4. **Burstiness & Rythme vivant** : écart-type des longueurs de phrases ≥ 5,0 avec ≥ 2 phrases courtes (≤ 8 mots) ; zéro début de paragraphe répété ≥ 3×.
5. **Zéro duplication transverse** : phrases, H2, puces et questions FAQ distincts d'une fiche ou d'un article à l'autre.
6. **Typographie française** : décimales à la virgule (`98,6 %`), pas d'intervalle anglo-saxon (`20-50 €` → `20 à 50 €`), pas de double espace.
