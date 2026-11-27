# Règles Unifiées des Skills & Anti-Régression — b2bpro.store

1. **Catalogue des skills actifs** : `.agents/skills.json` filtre les skills redondants/conflictuels et active le socle unifié (`redaction-seo-geo-aio`, `blueocean-keywords`, `geo-citations-ia`, `humanisation-traces-ia`, `audit-unifie-qualite`, `agent-browser`, outils médias/docs).
2. **Avant toute rédaction** : suivre `skills/redaction-seo-geo-aio/SKILL.md` (v3.0 unifié SGA™ + Blue Ocean + Zéro Trace d'IA) et sourcer les mots-clés via `bun run research:kw`.
3. **Avant et après toute modification** : respecter `docs/REGRESSION-GUARD.md` et exécuter `bun run guard && bun run lint && bun test tests/blog-mobile.test.ts`.
