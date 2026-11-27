---
name: blueocean-keywords
description: >-
  Méthode Blue Ocean Keywords unifiée avec b2bpro (SGA™). Combine l'autocomplete
  multi-pays francophone (fr, ci, cm, sn), le scoring proxy KD sans outil payant,
  la résistance AI Overviews, l'anti-cannibalisation croisée sur les 113 fiches
  et le Query Fan-Out sur 5 axes.
---

# Blue Ocean Keywords × b2bpro

Complète `bun run research:kw` (`scripts/keyword-research.ts`) avec le filtrage
Blue Ocean multi-pays (`amens.store`) pour isoler les requêtes à fort potentiel
et faible concurrence.

## Exécution locale dans b2bpro

```bash
# 1. Expansion Google Suggest + anti-cannibalisation base SQLite b2bpro
bun run research:kw -- --query="prospection b2b"
bun run research:kw -- --pole="ia-rag-data"

# 2. Collecte autocomplete multi-pays (fr, ci, cm, sn) + scoring proxy KD Blue Ocean
python .agents/skills/blueocean-keywords/scripts/suggest.py --graine "prospection b2b" --hl fr --pays fr,ci,cm,sn --profondeur 1 --sortie .tmp-kw.json
python .agents/skills/blueocean-keywords/scripts/prioriser.py --entree .tmp-kw.json --angle 10 --sortie .tmp-kw.csv
```

## Filtre de sélection unifié (≥ 2 conditions sur 3)

1. **Difficulté proxy faible** : longue traîne 3–5+ mots ou requête métier/locale sans géant en frontal (`data/gen/elite-keywords.ts` vérifié).
2. **Résistance AI Overviews forte** : l'acheteur a besoin d'un livrable, d'un fichier vérifié, d'un audit ou d'un comparatif chiffré qu'un résumé IA ne suffit pas à fournir.
3. **Potentiel commercial B2B fort** : intention d'achat, de délégation, d'audit ou de comparaison liée à au moins 3 services réels de `/services/`.

## Règles strictes

- Zéro volume inventé (utiliser des classes `basse` / `moyenne` / `élevée` si aucun volume vérifié n'est disponible).
- Tête primaire **3–5 mots significatifs**, unique entre fiches et ancrée dans le titre.
- Cartographier les 5 axes Query Fan-Out (éligibilité, coût, processus, specs/zone, variantes).
