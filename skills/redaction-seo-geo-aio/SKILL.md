---
name: redaction-seo-geo-aio
description: Skill rédactionnel OBLIGATOIRE (méthode SGA™ : SEO + GEO + AIO) pour TOUT contenu b2bpro.store — fiche de service, article de blog, page, mise à jour. Se déclenche dès qu'une tâche implique d'écrire, de modifier ou de valider un contenu du site. Source de vérité versionnée : docs/SKILL-REDACTION-SEO-GEO-AIO.md.
---

# Skill rédactionnel SGA™ — SEO + GEO + AIO (obligatoire)

> **AUCUNE rédaction — fiche de service, article de blog, page, mise à jour —
> n'est accomplie sans passer par ce skill.** Un contenu sous-standard fait
> échouer la garde d'intégrité : il est REFUSÉ. Miroir exécutable du contrat
> complet : `docs/SKILL-REDACTION-SEO-GEO-AIO.md` (v1.9.0).

## Pipeline imposé (7 étapes)

1. **SOURCER** les mots-clés à fort trafic AVANT d'écrire — une intention =
   une page, jamais de cannibalisation. Preuve de sourçage enregistrée dans
   `data/keyword-sources.json` (pools par pôle : `data/gen/poles.ts`).
2. **Mots-clés** : `primary` = tête commerciale de **3 à 5 mots significatifs**,
   sous-chaîne contiguë du titre (générée par `buildKeywordsV2` +
   `clampPrimaryToSkill`, primaires curatés `data/gen/elite-keywords.ts`) ;
   `secondary ≥ 3`, `longTail ≥ 3`, `aiQueries ≥ 3`.
3. **Template SGA™** de fiche : answer-first (primaire dans les 250 premiers
   caractères + prix, délai, note, garanties) → Pourquoi décisif → Ce que vous
   recevez → Avantage concurrentiel → Pourquoi b2bpro.store (E-E-A-T chiffré).
   Chaque paragraphe porte ≥ 1 fait « liftable ».
4. **Standards quantitatifs** (vérifiés machine, zéro tolérance — tableau complet
   dans le contrat miroir) : title 40-75 contenant le primaire · shortDesc
   100-230 · description ≥ 1000 car. + ≥ 3 H2 + listes · FAQ ≥ 4 Q/R (réponses
   ≥ 80 car.) **dont la 1ère question commence par « comment… »** ·
   features/delivrables/process ≥ 4/3/3 · blog : titre ≤ 75, extrait 80-200,
   ≥ 1500 car., ≥ 3 H2, **≥ 3 liens absolus vers /services/**, zéro cadratin,
   zéro nombre figé de services.
5. **Intégration technique** : nouveau service via `data/catalog.json` →
   `bun run add:service -- --code=<code>` (funnel humanisé unique) ; nouvel
   article via `data/blog/<slug>.md` → `bun run add:blog -- --slug=<slug>`
   (porte de qualité pré-insertion). Slugs JAMAIS modifiés.
6. **Validation machine** (porte de qualité — échec = contenu refusé) :
   ```bash
   bun run audit:content   # audit individuel de chaque service et article
   bun run audit:seo       # scanner élite SEO/GEO/AIO (passe profonde)
   bun run guard           # 19 contrôles d'intégrité (dont 4 standards élite)
   bun run lint
   ```
7. **Activateurs de citation IA** (implémentés en code — answer-first
   « Réponse rapide », chiffres citables, liens directs, FAQ « comment… ») :
   garder title/primary/prix/délai/note exacts et cohérents.

## Interdits absolus

1. Nombre figé de services (compteurs dynamiques uniquement).
2. Modifier un slug existant (URLs indexées = actif SEO).
3. Prix/délai hors catalogue (cohérence support IA ↔ fiches).
4. Retirer un JSON-LD / llms.txt / robots.txt / méta existant.
5. Promesses non tenables — factuel, chiffré, daté.
6. Contenu dupliqué (intentions et bios uniques).

## Références d'exécution

- Contrat complet : `docs/SKILL-REDACTION-SEO-GEO-AIO.md`
- Gardes : `src/lib/guard.ts` (contrôles `services-content-standards`,
  `services-primary-wordcount`, `services-primary-unique`,
  `services-faq-first-comment`, `blog-content-standards`, `blog-seo-standards`)
- Audits : `scripts/audit-content.ts`, `scripts/audit-seo-geo-aio.ts`
- Générateurs : `data/gen/humanize.ts` (+ `data/gen/elite-keywords.ts`),
  `data/gen/enrich.ts` ; preuves de sourçage : `data/keyword-sources.json`
