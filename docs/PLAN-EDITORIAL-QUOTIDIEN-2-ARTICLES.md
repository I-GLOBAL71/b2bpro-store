# 📅 PROTOCOLE & PLAN ÉDITORIAL QUOTIDIEN : 2 ARTICLES PAR JOUR (CADENCE NATURELLE & ANTI-SPAM GOOGLE)

> **Projet :** `b2bpro.store` — Domination conjointe Google Top 1, Moteurs IA (GEO/AIO) & E-E-A-T 2026.
> **Cadence stricte :** Exactement **2 articles d'autorité par jour**, espacés d'un intervalle raisonnable de **6 à 7 heures**.
> **Standards rédactionnels :** 100 % conforme à la Méthode SGA™ (`docs/SKILL-REDACTION-SEO-GEO-AIO.md`), aux critères Zéro Trace d'IA (`ai-writing-humanizer`) et audité par machine (`scripts/verify-blog-elite.ts`).

---

## 1. Pourquoi le délai de 6 à 7 heures entre les 2 articles est vital pour Google

Les algorithmes modernes de Google (SpamBrain, Helpful Content System et le planificateur de crawl de Googlebot) analysent le comportement de publication pour détecter les fermes de contenu généré à la volée :

```
Créneau 1 (Matin 09h30 UTC+1)   ────────────────[ Pause naturelle de 6h45 ]────────────────   Créneau 2 (Après-midi 16h15 UTC+1)
[Lecture business début de journée]                                                               [Synthèse & veille fin de journée]
[Crawl Googlebot de mi-journée]                                                                   [Indexation & consolidation nocturne IA]
```

### Les 4 raisons algorithmiques majeures :
1. **Éviter le déclencheur de "Burst Spam" (SpamBrain) :** Publier plusieurs dizaines d'articles en quelques minutes ou secondes est le marqueur n°1 des sites automatisés de mauvaise qualité. Un espacement de 6 à 7 heures reproduit la cadence d'une rédaction humaine professionnelle.
2. **Optimisation du budget de crawl de Googlebot :** Googlebot visite les sites à forte autorité plusieurs fois par jour. En publiant le matin vers 09h30, le robot inspecte la première URL lors de son passage de mi-journée. Le passage de fin d'après-midi indexe le second article.
3. **Maximisation du temps de consultation (Signaux Utilisateurs & CTR) :** Deux parutions distinctes permettent aux décideurs B2B de consulter chaque article sans saturation, maximisant le taux d'engagement et réduisant le taux de rebond.
4. **Alimentation progressive des moteurs de réponse IA :** Perplexity, ChatGPT Search et Google AI Overviews effectuent des passes de découverte incrémentales. L'espacement permet d'ancrer les nouveaux sujets dans les graphes de connaissances sans écraser le contexte précédent.

---

## 2. Les Exigences Obligatoires Issues des Skills

Chaque article rédigé dans le cadre de ce plan doit respecter sans exception la grille d'évaluation ci-dessous :

### A. Domination Google & SEO Fondamental (30 pts)
- **Titre SEO :** 40 à 75 caractères, avec le mot-clé principal placé dans les premiers 65 % (Front-loading).
- **Meta Description :** 80 à 200 caractères, concise, active et engageante.
- **Volume :** $\ge 900$ mots (recommandé : 950 à 1 200 mots).
- **Structure :** Au moins 3 à 5 sections `## H2` logiques.
- **Maillage interne absolu :** Au moins 3 liens hypertextes absolus au format `https://b2bpro.store/services/<slug>`, pointant exclusivement vers des fiches services existantes en base.
- **Formulation ouverte :** Interdiction totale d'utiliser des mentions figées du type `\d{2,3} services` (le catalogue étant évolutif).

### B. Domination GEO & Moteurs IA (25 pts - Princeton KDD 2024)
- **Answer-First immédiat :** Paragraphe de synthèse `**La réponse en 30 secondes :**` placé dans les 350 premiers caractères (+40 % de citabilité IA).
- **Densité statistique chiffrée :** Au moins 4 données statistiques et métriques réelles avec décimales à la virgule (`%`, `€`, nombres) (+115 % de reprise par les LLMs).
- **Tableau comparatif Markdown :** Au moins 1 grand tableau structuré (cible prioritaire de Perplexity et Google AI Overviews).
- **FAQ activatrice GEO :** Au moins 3 questions/réponses en langage naturel, dont la première s'ouvre impérativement par une interrogation en « Comment… ».
- **Sources d'autorité citées :** Mention explicite d'études ou institutions crédibles (Insee, Gartner, McKinsey, Bpifrance, Harvard, CNIL, Ademe).

### C. Zéro Trace d'IA & 100 % Humain (25 pts)
- **Zéro tiret cadratin (`—`) ni demi-cadratin (`–`) :** Remplacer par des virgules, parenthèses ou deux-points.
- **Zéro marqueur lexical d'IA :** Bannissement total des clichés (en conclusion, pivot essentiel, catalyseur, plonger dans, force est de constater, indéniable, etc.).
- **Zéro disclaimer artificiel :** Ne JAMAIS ajouter de mention proclamant "100% humain" ou "sans IA" dans le corps du texte.
- **Burstiness élevée :** Alternance de phrases courtes ($\le 8$ mots) et de phrases d'analyse (écart-type des longueurs $\ge 5.0$).
- **Zéro caractère Unicode invisible / anti-watermark**.

### D. Marketing, Conversion CRO & Rassurance (10 pts)
- **Ancrage tarifaire transparent :** Présence d'un prix plancher clair (`dès 20 €`, `à partir de 25 €`, etc.).
- **Rassurance séquestre bancaire (Escrow) :** Mention explicite de la protection des fonds jusqu'à validation de la commande par l'acheteur.
- **Appel à l'action contextuel (CTA) :** Incitation naturelle à déléguer à un freelance vérifié sur la plateforme.

### E. Assets Visuels & Hébergement CDN (10 pts)
- **Format WebP 1200×630 :** Poids optimisé entre 25 et 40 Ko.
- **CDN Vercel Blob :** Image hébergée sur `store_LR22NEx73oduIp5N` et référencée dans `public/img/blog/manifest.json`.

---

## 3. La Suite d'Outillage Automatisée

Trois commandes orchestrent l'ensemble du cycle de vie éditorial :

```bash
# 1. Consulter le calendrier et l'état d'avancement
pnpm run daily:plan --status
pnpm run daily:plan --list

# 2. Générer le squelette d'un jour précis prêt pour la rédaction humaine
pnpm run daily:plan --day=1

# 3. Valider, illustrer, insérer, synchroniser Neon et soumettre à GSC en 1 clic
pnpm run daily:publish --pair=slug-matin,slug-apres-midi
```

---

## 4. Matrice du Calendrier Éditorial Quotidien (Exemple des 5 Premiers Jours)

| Jour | Créneau | Heure | Slug & Titre de l'Article | Mot-clé Principal | Pôle B2B Pro | Services Liés |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **J1** | Matin | 09:30 | `pipeline-rag-entreprise-documents-internes-ia`<br>*Pipeline RAG en entreprise : connecter vos documents internes aux IA* | `pipeline RAG entreprise` | IA, RAG & Data | `je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia`<br>`je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses`<br>`je-vais-extraire-tous-les-tableaux-financiers-de-vos-pdf-vers-excel` |
| **J1** | Après-midi | 16:15 | `citation-ia-marques-classement-perplexity-chatgpt`<br>*Citation de marques par les IA : le classement Perplexity et ChatGPT* | `citation de marques par les IA` | IA, RAG & Data | `je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia`<br>`je-vais-repertorier-les-nouveaux-outils-ia-et-saas-lances-ce-mois-ci`<br>`je-vais-optimiser-votre-code-promo-pour-qu-il-ressorte-dans-les-ia` |
| **J2** | Matin | 09:30 | `tarification-dynamique-ecommerce-algorithmes-prix`<br>*Tarification dynamique e-commerce : les algorithmes d'ajustement de prix* | `tarification dynamique e-commerce` | E-commerce & Prix | `je-vais-surveiller-en-direct-les-prix-et-stocks-de-vos-concurrents`<br>`je-vais-auditer-les-offres-promotionnelles-et-codes-promo-rivaux`<br>`je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents` |
| **J2** | Après-midi | 16:15 | `rupture-stock-concurrents-conquete-clients-ecommerce`<br>*Rupture de stock chez vos concurrents : conquérir des clients en direct* | `rupture de stock concurrents` | E-commerce & Prix | `je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`<br>`je-vais-surveiller-en-direct-les-prix-et-stocks-de-vos-concurrents`<br>`je-vais-cartographier-les-tarifs-et-delais-de-livraison-concurrents` |
| **J3** | Matin | 09:30 | `fichier-prospection-b2b-enrichi-email-telephone`<br>*Fichier de prospection B2B enrichi : adresses email et numéros directs* | `fichier de prospection B2B enrichi` | Prospection & Vente | `je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`<br>`je-vais-extraire-et-verifier-les-contacts-d-entreprises-qui-recrutent`<br>`je-vais-verifier-les-mentions-legales-et-conformite-rgpd-de-vos-sites` |
| **J3** | Après-midi | 16:15 | `signaux-recrutement-entreprises-prospection-ciblee`<br>*Signaux de recrutement des entreprises : prospecter au meilleur moment* | `signaux de recrutement entreprises` | Prospection & Vente | `je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur`<br>`je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`<br>`je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci` |
| **J4** | Matin | 09:30 | `negociation-immobiliere-baisses-prix-opportunites`<br>*Négociation immobilière et baisses de prix : repérer les vendeurs pressés* | `négociation immobilière baisses de prix` | Immobilier & Local | `je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`<br>`je-vais-calculer-la-rentabilite-brute-et-nette-de-vos-biens-cibles`<br>`je-vais-repertorier-les-permis-de-construire-et-declarations-travaux` |
| **J4** | Après-midi | 16:15 | `calcul-rendement-locatif-brut-net-investissement`<br>*Calcul du rendement locatif brut et net : sécuriser son investissement* | `calcul du rendement locatif brut` | Immobilier & Local | `je-vais-calculer-la-rentabilite-brute-et-nette-de-vos-biens-cibles`<br>`je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`<br>`je-vais-lister-les-agences-immobilieres-independantes-de-votre-zone` |
| **J5** | Matin | 09:30 | `sante-financiere-fournisseurs-audit-defaillances`<br>*Santé financière des fournisseurs : auditer les risques de défaillance* | `santé financière des fournisseurs` | Grandes Entreprises | `je-vais-auditer-la-sante-financiere-publique-de-vos-fournisseurs`<br>`je-vais-identifier-les-aides-et-subventions-publiques-pour-votre-proje`<br>`je-vais-verifier-les-mentions-legales-et-conformite-rgpd-de-vos-sites` |
| **J5** | Après-midi | 16:15 | `financement-france-2030-dossier-subvention-reussi`<br>*Financement France 2030 : préparer un dossier de subvention lauréat* | `financement France 2030 subvention` | Grandes Entreprises | `je-vais-identifier-les-aides-et-subventions-publiques-pour-votre-proje`<br>`je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci`<br>`je-vais-auditer-la-sante-financiere-publique-de-vos-fournisseurs` |

---

## 5. Procédure Pas-à-Pas pour la Rédaction Quotidienne

1. **Le Matin à 09h00 :**
   - Lancer `pnpm run daily:plan --day=<J>` pour créer les fichiers markdown.
   - Rédiger l'article du créneau du matin (09h30) en appliquant le style direct d'expert terrain, sans aucun cadratin, avec des phrases percutantes et des statistiques précises.
2. **Le Début d'Après-midi à 15h30 :**
   - Rédiger le second article du créneau d'après-midi (16h15).
3. **À 16h15 :**
   - Lancer la publication du binôme :
     ```bash
     pnpm run daily:publish --pair=<slug-matin>,<slug-apres-midi>
     ```
   - Le script effectue le contrôle bloquant S+, génère les WebPs, téléverse sur Vercel Blob, synchronise Neon et ajoute les liens dans la liste de soumission GSC.
4. **Validation finale :**
   - Commiter et pusher les fichiers créés sur le repository distant.
