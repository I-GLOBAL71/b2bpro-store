# 🚀 PLAN ÉDITORIAL & STRATÉGIE DE CONTENU : 52 ARTICLES DE BLOG (14 PÔLES)

> **Projet :** `b2bpro.store` — Domination SEO, GEO (moteurs génératifs) et AIO (moteurs de réponse)
> **Objectif :** Transformer les 12 articles existants en une autorité thématique complète (Topic Clusters) avec 52 nouveaux articles ultra-ciblés (environ 3 à 4 articles par pôle d'activité).
> **Conformité :** 100 % conforme aux exigences de la Méthode SGA™ (`skills/redaction-seo-geo-aio/SKILL.md`) et aux 19 contrôles bloquants de `src/lib/guard.ts`.

---

## 🎯 Architecture d'un Article Élite (Rappel des Standards SGA™)

Chaque article doit valider la commande :
```bash
bun run add:blog -- --slug=<slug>
# ou via pnpm :
pnpm dlx tsx --env-file=.env scripts/add-blog.ts --slug=<slug>
```

| Critère | Seuil Machine Obligatoire |
|---|---|
| **Titre** | 40 à 75 caractères (contient impérativement le mot-clé primaire) |
| **Extrait (meta)** | 80 à 200 caractères (answer-first en 1 phrase percutante) |
| **Longueur** | ≥ 1 500 caractères (recommandé 1 200 à 2 000 mots pour la longue traîne) |
| **Structure H2** | ≥ 3 sections `##` bien identifiées |
| **Maillage interne** | ≥ 3 liens absolus vers des fiches réelles existantes (`https://b2bpro.store/services/<slug>`) |
| **Typographie & Hygiène** | Zéro cadratin (`—`), décimales à la virgule, aucun nombre figé de services |
| **GEO / Citabilité IA** | ≥ 1 tableau comparatif ou liste chiffrée, statistiques réelles sourcées |

---

## 🗺️ Répartition des 52 Articles par Pôle d'Activité

---

### Pôle 1 : IA, RAG & Data (`ia-rag-data`)
*Services liés : `je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia`, `je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses`, `je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia`*

1. **Article 1 :**
   - **Titre :** *Créer une base de connaissances IA pour votre chatbot d'entreprise* (65 car.)
   - **Slug :** `creer-base-connaissances-ia-chatbot`
   - **Mot-clé primaire :** `base de connaissances IA`
   - **Intention :** Guide pratique d'implémentation RAG pour PME.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia`
     - `https://b2bpro.store/services/je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses`
     - `https://b2bpro.store/services/je-vais-nettoyer-et-structurer-votre-fichier-excel-ou-csv-brut`

2. **Article 2 :**
   - **Titre :** *Audit de visibilité IA : comment tester sa marque sur ChatGPT et Perplexity* (75 car.)
   - **Slug :** `audit-visibilite-ia-chatgpt-perplexity`
   - **Mot-clé primaire :** `audit de visibilité IA`
   - **Intention :** Benchmark et mesure de notoriété dans les LLMs.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia`
     - `https://b2bpro.store/services/je-vais-optimiser-votre-code-promo-pour-qu-il-ressorte-dans-les-ia`
     - `https://b2bpro.store/services/je-vais-convertir-votre-documentation-en-dataset-fine-tuning`

3. **Article 3 :**
   - **Titre :** *Nettoyage de données Excel et CSV : la méthode pour fiabiliser vos imports* (75 car.)
   - **Slug :** `nettoyage-donnees-excel-csv-fiabilite`
   - **Mot-clé primaire :** `nettoyage de données Excel`
   - **Intention :** Tuto data hygiene avant intégration CRM / ERP.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-nettoyer-et-structurer-votre-fichier-excel-ou-csv-brut`
     - `https://b2bpro.store/services/je-vais-enrichir-vos-fichiers-clients-avec-les-donnees-societe-com`
     - `https://b2bpro.store/services/je-vais-fusionner-et-dedoublonner-vos-fichiers-de-contacts-b2b`

4. **Article 4 :**
   - **Titre :** *Dataset de questions réponses : structurer vos FAQ pour l'IA générative* (72 car.)
   - **Slug :** `dataset-questions-reponses-faq-ia`
   - **Mot-clé primaire :** `dataset de questions réponses`
   - **Intention :** Structuration de données non structurées pour le support client.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-transformer-votre-contenu-en-jeu-de-donnees-questions-reponses`
     - `https://b2bpro.store/services/je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia`
     - `https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia`

---

### Pôle 2 : B2B Sales Intelligence & Prospection (`b2b-sales-intelligence`)
*Services liés : `je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`, `je-vais-extraire-les-leads-qualifies-des-membres-d-un-groupe-linkedin`, `je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur`*

5. **Article 5 :**
   - **Titre :** *Fichier de prospection B2B qualifié : critères et méthodes de vérification* (75 car.)
   - **Slug :** `fichier-prospection-b2b-qualifie-verification`
   - **Mot-clé primaire :** `fichier de prospection B2B`
   - **Intention :** Guide d'achat de base de données prospects sans risquer le spam.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`
     - `https://b2bpro.store/services/je-vais-enrichir-vos-fichiers-clients-avec-les-donnees-societe-com`
     - `https://b2bpro.store/services/je-vais-extraire-les-leads-qualifies-des-membres-d-un-groupe-linkedin`

6. **Article 6 :**
   - **Titre :** *Scraping de groupes LinkedIn : extraire des prospects ciblés en toute légalité* (77 car. → ajusté : *Scraping LinkedIn : extraire des prospects ciblés légalement*, 61 car.)
   - **Slug :** `scraping-linkedin-extraire-prospects-cibles`
   - **Mot-clé primaire :** `scraping LinkedIn prospects`
   - **Intention :** Stratégie de génération de leads communautaires B2B.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-extraire-les-leads-qualifies-des-membres-d-un-groupe-linkedin`
     - `https://b2bpro.store/services/je-vais-identifier-les-decideurs-cles-sur-linkedin-pour-votre-offre`
     - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`

7. **Article 7 :**
   - **Titre :** *Signaux d'affaires : cibler les entreprises qui recrutent en B2B* (62 car.)
   - **Slug :** `signaux-affaires-entreprises-recrutent-b2b`
   - **Mot-clé primaire :** `entreprises qui recrutent`
   - **Intention :** Prospection contextuelle déclenchée par des embauches.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur`
     - `https://b2bpro.store/services/je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci`
     - `https://b2bpro.store/services/je-vais-identifier-les-decideurs-cles-sur-linkedin-pour-votre-offre`

8. **Article 8 :**
   - **Titre :** *Levées de fonds de startups : détecter les opportunités commerciales fraîches* (75 car.)
   - **Slug :** `levees-fonds-startups-opportunites-commerciales`
   - **Mot-clé primaire :** `levées de fonds de startups`
   - **Intention :** Approche de vente B2B auprès des entreprises récemment financées.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-lister-les-startups-et-pme-ayant-leve-des-fonds-ce-mois-ci`
     - `https://b2bpro.store/services/je-vais-identifier-les-entreprises-qui-recrutent-dans-votre-secteur`
     - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`

---

### Pôle 3 : E-commerce & Pricing (`ecommerce-pricing`)
*Services liés : `je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`, `je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`, `je-vais-extraire-les-meilleures-ventes-amazon-de-votre-niche`*

9. **Article 9 :**
   - **Titre :** *Surveillance des ruptures de stock concurrentes pour doper ses ventes e-commerce* (80 car. → ajusté : *Ruptures de stock concurrentes : capter la demande orpheline*, 60 car.)
   - **Slug :** `ruptures-stock-concurrentes-opportunite-ventes`
   - **Mot-clé primaire :** `ruptures de stock concurrentes`
   - **Intention :** Tactique de conquête e-commerce basée sur la disponibilité.
   - **Services à mailler :**
     - `https://b2bpro.store/services/je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`
     - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`
     - `https://b2bpro.store/services/je-vais-comparer-les-frais-de-port-et-delais-de-vos-rivaux-e-commerce`

10. **Article 10 :**
    - **Titre :** *Veille tarifaire e-commerce : comment ajuster ses prix sans guerre destructrice* (80 car. → ajusté : *Veille tarifaire e-commerce : ajuster ses prix intelligemment*, 61 car.)
    - **Slug :** `veille-tarifaire-ecommerce-ajuster-prix`
    - **Mot-clé primaire :** `veille tarifaire e-commerce`
    - **Intention :** Stratégie de dynamic pricing et benchmark concurrentiel.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`
      - `https://b2bpro.store/services/je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-extraire-les-meilleures-ventes-amazon-de-votre-niche`

11. **Article 11 :**
    - **Titre :** *Meilleures ventes Amazon : trouver les produits gagnants de votre niche* (70 car.)
    - **Slug :** `meilleures-ventes-amazon-produits-gagnants`
    - **Mot-clé primaire :** `meilleures ventes Amazon`
    - **Intention :** Sélection de catalogue dropshipping / e-commerce de marque.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-les-meilleures-ventes-amazon-de-votre-niche`
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`
      - `https://b2bpro.store/services/je-vais-extraire-les-mots-cles-payants-des-fiches-produits-adverses`

12. **Article 12 :**
    - **Titre :** *Frais de livraison et délais e-commerce : benchmark des standards du marché* (75 car.)
    - **Slug :** `frais-livraison-delais-ecommerce-benchmark`
    - **Mot-clé primaire :** `frais de livraison e-commerce`
    - **Intention :** Réduire le taux d'abandon panier lié à la logistique.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-comparer-les-frais-de-port-et-delais-de-vos-rivaux-e-commerce`
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`
      - `https://b2bpro.store/services/je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`

---

### Pôle 4 : Immobilier & Local (`immobilier-local`)
*Services liés : `je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`, `je-vais-auditer-la-visibilite-google-maps-de-vos-3-etablissements-locaux`, `je-vais-recenser-les-terrains-constructibles-disponibles-dans-votre-canton`*

13. **Article 13 :**
    - **Titre :** *Dénicher des annonces immobilières sous le prix du marché : méthode et outils* (76 car. → ajusté : *Annonces immobilières sous le prix du marché : la méthode*, 57 car.)
    - **Slug :** `annonces-immobilieres-sous-prix-marche`
    - **Mot-clé primaire :** `annonces immobilières sous le prix`
    - **Intention :** Guide d'investissement locatif et marchand de biens.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`
      - `https://b2bpro.store/services/je-vais-analyser-la-rentabilite-brute-de-100-biens-dans-votre-ville`
      - `https://b2bpro.store/services/je-vais-recenser-les-terrains-constructibles-disponibles-dans-votre-canton`

14. **Article 14 :**
    - **Titre :** *Audit Google Maps : optimiser sa fiche Google Business pour dominer localement* (76 car. → ajusté : *Audit Google Maps : optimiser sa fiche d'établissement*, 54 car.)
    - **Slug :** `audit-google-maps-etablissement-local`
    - **Mot-clé primaire :** `audit Google Maps`
    - **Intention :** Visibilité locale multi-sites et commerces de proximité.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-auditer-la-visibilite-google-maps-de-vos-3-etablissements-locaux`
      - `https://b2bpro.store/services/je-vais-cartographier-les-avis-de-vos-concurrents-sur-google-maps`
      - `https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`

15. **Article 15 :**
    - **Titre :** *Rentabilité brute immobilière : comment calculer le rendement de 100 biens* (75 car.)
    - **Slug :** `rentabilite-brute-immobiliere-calcul-rendement`
    - **Mot-clé primaire :** `rentabilité brute immobilière`
    - **Intention :** Analyse financière rapide d'un portefeuille d'opportunités.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-la-rentabilite-brute-de-100-biens-dans-votre-ville`
      - `https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`
      - `https://b2bpro.store/services/je-vais-recenser-les-terrains-constructibles-disponibles-dans-votre-canton`

16. **Article 16 :**
    - **Titre :** *Recherche de terrains constructibles : démarches et cadastre pour promoteurs* (75 car.)
    - **Slug :** `recherche-terrains-constructibles-cadastre`
    - **Mot-clé primaire :** `terrains constructibles cadastre`
    - **Intention :** Prospection foncière pour constructeurs et investisseurs.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-recenser-les-terrains-constructibles-disponibles-dans-votre-canton`
      - `https://b2bpro.store/services/je-vais-detecter-les-annonces-immobilieres-sous-le-prix-du-marche`
      - `https://b2bpro.store/services/je-vais-analyser-la-rentabilite-brute-de-100-biens-dans-votre-ville`

---

### Pôle 5 : Social Media & Influence (`social-media-influence`)
*Services liés : `je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement`, `je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche`, `je-vais-extraire-les-hashtags-qui-generent-le-plus-d-engagement-sur-tiktok`*

17. **Article 17 :**
    - **Titre :** *Trouver des micro-influenceurs rentables : calcul du vrai taux d'engagement* (75 car.)
    - **Slug :** `trouver-micro-influenceurs-vrai-taux-engagement`
    - **Mot-clé primaire :** `trouver des micro-influenceurs`
    - **Intention :** Détection de faux abonnés et ROI des partenariats créateurs.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement`
      - `https://b2bpro.store/services/je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche`
      - `https://b2bpro.store/services/je-vais-extraire-les-hashtags-qui-generent-le-plus-d-engagement-sur-tiktok`

18. **Article 18 :**
    - **Titre :** *Vidéos YouTube les plus vues : décrypter les formats qui cartonnent en B2B* (74 car.)
    - **Slug :** `videos-youtube-plus-vues-formats-b2b`
    - **Mot-clé primaire :** `vidéos YouTube les plus vues`
    - **Intention :** Inbound marketing vidéo et stratégie de rétention.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche`
      - `https://b2bpro.store/services/je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement`
      - `https://b2bpro.store/services/je-vais-extraire-les-hashtags-qui-generent-le-plus-d-engagement-sur-tiktok`

19. **Article 19 :**
    - **Titre :** *Hashtags TikTok et engagement : l'algorithme décrypté pour les marques* (70 car.)
    - **Slug :** `hashtags-tiktok-engagement-algorithme-marques`
    - **Mot-clé primaire :** `hashtags TikTok engagement`
    - **Intention :** Conquête de trafic organique social et trends viraux.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-les-hashtags-qui-generent-le-plus-d-engagement-sur-tiktok`
      - `https://b2bpro.store/services/je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement`
      - `https://b2bpro.store/services/je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche`

20. **Article 20 :**
    - **Titre :** *Veille sur les créateurs de contenu : devancer les tendances de votre secteur* (76 car. → ajusté : *Veille créateurs de contenu : devancer les tendances*, 53 car.)
    - **Slug :** `veille-createurs-contenu-tendances-secteur`
    - **Mot-clé primaire :** `veille créateurs de contenu`
    - **Intention :** Anticiper les lancements de produits concurrents sur les réseaux.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-lister-des-micro-influenceurs-avec-vrai-taux-d-engagement`
      - `https://b2bpro.store/services/je-vais-analyser-les-50-videos-youtube-les-plus-vues-de-votre-niche`
      - `https://b2bpro.store/services/je-vais-extraire-les-hashtags-qui-generent-le-plus-d-engagement-sur-tiktok`

---

### Pôle 6 : RH & Recrutement (`rh-recrutement`)
*Services liés : `je-vais-extraire-les-offres-d-emploi-tech-dans-votre-region`, `je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor`, `je-vais-sourcer-50-candidats-passifs-qualifies-sur-linkedin`*

21. **Article 21 :**
    - **Titre :** *Sourcing de candidats passifs sur LinkedIn : la méthode qui double les retours* (77 car. → ajusté : *Sourcing de candidats passifs : doubler les retours*, 52 car.)
    - **Slug :** `sourcing-candidats-passifs-linkedin-methode`
    - **Mot-clé primaire :** `sourcing de candidats passifs`
    - **Intention :** Chasse de talents rares pour recruteurs et cabinets.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-sourcer-50-candidats-passifs-qualifies-sur-linkedin`
      - `https://b2bpro.store/services/je-vais-extraire-les-offres-d-emploi-tech-dans-votre-region`
      - `https://b2bpro.store/services/je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor`

22. **Article 22 :**
    - **Titre :** *Avis Glassdoor et salaires concurrents : maîtriser sa marque employeur* (70 car.)
    - **Slug :** `avis-glassdoor-salaires-concurrents-marque-employeur`
    - **Mot-clé primaire :** `avis Glassdoor et salaires`
    - **Intention :** Benchmark de politique de rémunération et e-réputation RH.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor`
      - `https://b2bpro.store/services/je-vais-sourcer-50-candidats-passifs-qualifies-sur-linkedin`
      - `https://b2bpro.store/services/je-vais-extraire-les-offres-d-emploi-tech-dans-votre-region`

23. **Article 23 :**
    - **Titre :** *Veille sur les offres d'emploi tech : cartographier les tensions de recrutement* (77 car. → ajusté : *Offres d'emploi tech : cartographier les tensions RH*, 54 car.)
    - **Slug :** `offres-emploi-tech-tensions-recrutement`
    - **Mot-clé primaire :** `offres d'emploi tech`
    - **Intention :** Intelligence RH régionale et baromètre de salaires.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-les-offres-d-emploi-tech-dans-votre-region`
      - `https://b2bpro.store/services/je-vais-sourcer-50-candidats-passifs-qualifies-sur-linkedin`
      - `https://b2bpro.store/services/je-vais-analyser-les-avis-employes-et-salaires-de-5-rivaux-glassdoor`

---

### Pôle 7 : Événementiel & Marchés Publics (`evenementiel-marches-publics`)
*Services liés : `je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro`, `je-vais-vous-alerter-sur-les-appels-d-offres-publics-de-votre-secteur`, `je-vais-analyser-les-attributions-de-marches-publics-de-vos-concurrents`*

24. **Article 24 :**
    - **Titre :** *Liste des exposants d'un salon professionnel : rentabiliser sa visite* (70 car.)
    - **Slug :** `liste-exposants-salon-professionnel-rentabilite`
    - **Mot-clé primaire :** `exposants d'un salon professionnel`
    - **Intention :** Préparer ses rendez-vous commerciaux avant un événement.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro`
      - `https://b2bpro.store/services/je-vais-vous-alerter-sur-les-appels-d-offres-publics-de-votre-secteur`
      - `https://b2bpro.store/services/je-vais-analyser-les-attributions-de-marches-publics-de-vos-concurrents`

25. **Article 25 :**
    - **Titre :** *Veille appels d'offres publics BOAMP : comment remporter des marchés publics* (76 car. → ajusté : *Veille appels d'offres publics : la méthode BOAMP*, 51 car.)
    - **Slug :** `veille-appels-offres-publics-methode-boamp`
    - **Mot-clé primaire :** `appels d'offres publics`
    - **Intention :** Guide pour PME souhaitant décrocher des contrats avec l'État ou les collectivités.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-vous-alerter-sur-les-appels-d-offres-publics-de-votre-secteur`
      - `https://b2bpro.store/services/je-vais-analyser-les-attributions-de-marches-publics-de-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro`

26. **Article 26 :**
    - **Titre :** *Attributions de marchés publics : analyser les prix des concurrents gagnants* (75 car.)
    - **Slug :** `attributions-marches-publics-prix-concurrents`
    - **Mot-clé primaire :** `attributions de marchés publics`
    - **Intention :** Comprendre les barèmes tarifaires qui remportent la commande publique.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-attributions-de-marches-publics-de-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-vous-alerter-sur-les-appels-d-offres-publics-de-votre-secteur`
      - `https://b2bpro.store/services/je-vais-extraire-la-liste-complete-des-exposants-d-un-salon-pro`

---

### Pôle 8 : SaaS & Tech (`saas-tech`)
*Services liés : `je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra`, `je-vais-analyser-les-technologies-utilisees-par-100-sites-concurrents`, `je-vais-auditer-la-vitesse-et-les-core-web-vitals-de-vos-pages`*

27. **Article 27 :**
    - **Titre :** *Avis G2 et Capterra : analyser les faiblesses des logiciels concurrents* (73 car.)
    - **Slug :** `avis-g2-capterra-faiblesses-logiciels-concurrents`
    - **Mot-clé primaire :** `avis G2 et Capterra`
    - **Intention :** Product marketing et battle cards commerciales pour éditeurs SaaS.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra`
      - `https://b2bpro.store/services/je-vais-analyser-les-technologies-utilisees-par-100-sites-concurrents`
      - `https://b2bpro.store/services/je-vais-auditer-la-vitesse-et-les-core-web-vitals-de-vos-pages`

28. **Article 28 :**
    - **Titre :** *Stack technologique concurrente : détecter les outils utilisés avec BuiltWith* (77 car. → ajusté : *Stack technologique concurrente : détecter les outils*, 54 car.)
    - **Slug :** `stack-technologique-concurrente-outils-detection`
    - **Mot-clé primaire :** `stack technologique concurrente`
    - **Intention :** Identifier les CMS, ERP et outils marketing rivaux.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-technologies-utilisees-par-100-sites-concurrents`
      - `https://b2bpro.store/services/je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra`
      - `https://b2bpro.store/services/je-vais-auditer-la-vitesse-et-les-core-web-vitals-de-vos-pages`

29. **Article 29 :**
    - **Titre :** *Core Web Vitals : optimiser la vitesse de son site pour le SEO technique* (72 car.)
    - **Slug :** `core-web-vitals-vitesse-site-seo-technique`
    - **Mot-clé primaire :** `Core Web Vitals vitesse`
    - **Intention :** Résoudre les problèmes LCP, FID/INP et CLS.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-auditer-la-vitesse-et-les-core-web-vitals-de-vos-pages`
      - `https://b2bpro.store/services/je-vais-analyser-les-technologies-utilisees-par-100-sites-concurrents`
      - `https://b2bpro.store/services/je-vais-extraire-les-critiques-de-vos-concurrents-saas-sur-g2-capterra`

---

### Pôle 9 : SEO, GEO & Médias (`seo-geo-medias`)
*Services liés : `je-vais-auditer-la-structure-balises-et-maillage-de-votre-site`, `je-vais-analyser-le-profil-de-backlinks-de-vos-3-rivaux-majeurs`, `je-vais-trouver-les-mots-cles-ou-vos-concurrents-rankent-et-pas-vous`*

30. **Article 30 :**
    - **Titre :** *Profil de backlinks concurrents : espionner les liens qui font leur autorité* (76 car. → ajusté : *Profil de backlinks : espionner les liens concurrents*, 54 car.)
    - **Slug :** `profil-backlinks-espionner-liens-concurrents`
    - **Mot-clé primaire :** `profil de backlinks concurrents`
    - **Intention :** Stratégie de netlinking chirurgicale.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-le-profil-de-backlinks-de-vos-3-rivaux-majeurs`
      - `https://b2bpro.store/services/je-vais-trouver-les-mots-cles-ou-vos-concurrents-rankent-et-pas-vous`
      - `https://b2bpro.store/services/je-vais-auditer-la-structure-balises-et-maillage-de-votre-site`

31. **Article 31 :**
    - **Titre :** *Content Gap SEO : trouver les mots-clés où vos concurrents vous battent* (72 car.)
    - **Slug :** `content-gap-seo-mots-cles-concurrents`
    - **Mot-clé primaire :** `content gap SEO mots-clés`
    - **Intention :** Rattraper le retard sur les requêtes à fort volume.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-trouver-les-mots-cles-ou-vos-concurrents-rankent-et-pas-vous`
      - `https://b2bpro.store/services/je-vais-analyser-le-profil-de-backlinks-de-vos-3-rivaux-majeurs`
      - `https://b2bpro.store/services/je-vais-auditer-la-structure-balises-et-maillage-de-votre-site`

32. **Article 32 :**
    - **Titre :** *Audit de maillage interne : la clé cachée du référencement naturel* (68 car.)
    - **Slug :** `audit-maillage-interne-referencement-naturel`
    - **Mot-clé primaire :** `audit de maillage interne`
    - **Intention :** Redistribution du jus de lien et Topic Clusters.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-auditer-la-structure-balises-et-maillage-de-votre-site`
      - `https://b2bpro.store/services/je-vais-trouver-les-mots-cles-ou-vos-concurrents-rankent-et-pas-vous`
      - `https://b2bpro.store/services/je-vais-analyser-le-profil-de-backlinks-de-vos-3-rivaux-majeurs`

---

### Pôle 10 : Hôtellerie & Tourisme (`hotellerie-tourisme`)
*Services liés : `je-vais-analyser-les-prix-et-disponibilites-de-10-hotels-concurrents`, `je-vais-recenser-les-avis-negatifs-tripadvisor-et-booking-de-votre-secteur`, `je-vais-comparer-les-politiques-d-annulation-et-conditions-hotelieres`*

33. **Article 33 :**
    - **Titre :** *Tarification hôtelière dynamique : suivre les prix Booking et Airbnb rivaux* (76 car. → ajusté : *Tarification hôtelière : suivre les prix Booking rivaux*, 55 car.)
    - **Slug :** `tarification-hoteliere-prix-booking-airbnb`
    - **Mot-clé primaire :** `tarification hôtelière dynamique`
    - **Intention :** Yield management pour hôteliers indépendants et gîtes.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-disponibilites-de-10-hotels-concurrents`
      - `https://b2bpro.store/services/je-vais-recenser-les-avis-negatifs-tripadvisor-et-booking-de-votre-secteur`
      - `https://b2bpro.store/services/je-vais-comparer-les-politiques-d-annulation-et-conditions-hotelieres`

34. **Article 34 :**
    - **Titre :** *Avis TripAdvisor et Booking : transformer les critiques en axes de progrès* (76 car. → ajusté : *Avis TripAdvisor : transformer les critiques négatives*, 55 car.)
    - **Slug :** `avis-tripadvisor-booking-critiques-amelioration`
    - **Mot-clé primaire :** `avis TripAdvisor négatifs`
    - **Intention :** E-réputation hôtelière et satisfaction client.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-recenser-les-avis-negatifs-tripadvisor-et-booking-de-votre-secteur`
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-disponibilites-de-10-hotels-concurrents`
      - `https://b2bpro.store/services/je-vais-comparer-les-politiques-d-annulation-et-conditions-hotelieres`

35. **Article 35 :**
    - **Titre :** *Politiques d'annulation d'hôtels : comparer les conditions pour séduire* (73 car.)
    - **Slug :** `politiques-annulation-hotels-comparatif-conditions`
    - **Mot-clé primaire :** `politiques d'annulation d'hôtels`
    - **Intention :** Attirer les réservations directes sans commission OTA.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-comparer-les-politiques-d-annulation-et-conditions-hotelieres`
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-disponibilites-de-10-hotels-concurrents`
      - `https://b2bpro.store/services/je-vais-recenser-les-avis-negatifs-tripadvisor-et-booking-de-votre-secteur`

---

### Pôle 11 : Grandes Entreprises & Finance (`grandes-entreprises`)
*Services liés : `je-vais-analyser-les-bilans-financiers-et-ratios-de-5-concurrents`, `je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`, `je-vais-extraire-les-brevets-deposes-recemment-dans-votre-secteur`*

36. **Article 36 :**
    - **Titre :** *Analyse de bilans financiers d'entreprises : les ratios clés à surveiller* (74 car.)
    - **Slug :** `analyse-bilans-financiers-entreprises-ratios`
    - **Mot-clé primaire :** `analyse de bilans financiers`
    - **Intention :** Évaluation de la santé financière d'un fournisseur ou concurrent.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-bilans-financiers-et-ratios-de-5-concurrents`
      - `https://b2bpro.store/services/je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`
      - `https://b2bpro.store/services/je-vais-extraire-les-brevets-deposes-recemment-dans-votre-secteur`

37. **Article 37 :**
    - **Titre :** *Conformité RGPD et mentions légales : sécuriser son site web en 2026* (69 car.)
    - **Slug :** `conformite-rgpd-mentions-legales-securisation`
    - **Mot-clé primaire :** `conformité RGPD mentions légales`
    - **Intention :** Éviter les amendes CNIL et rassurer les acheteurs B2B.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`
      - `https://b2bpro.store/services/je-vais-analyser-les-bilans-financiers-et-ratios-de-5-concurrents`
      - `https://b2bpro.store/services/je-vais-extraire-les-brevets-deposes-recemment-dans-votre-secteur`

38. **Article 38 :**
    - **Titre :** *Veille brevets INPI et brevets internationaux : protéger ses innovations* (74 car.)
    - **Slug :** `veille-brevets-inpi-protection-innovations`
    - **Mot-clé primaire :** `veille brevets INPI`
    - **Intention :** Détecter les dépôts technologiques rivaux avant mise sur le marché.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-extraire-les-brevets-deposes-recemment-dans-votre-secteur`
      - `https://b2bpro.store/services/je-vais-analyser-les-bilans-financiers-et-ratios-de-5-concurrents`
      - `https://b2bpro.store/services/je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`

---

### Pôle 12 : Formation & Santé (`formation-sante`)
*Services liés : `je-vais-recenser-les-formations-eligibles-cpf-de-vos-concurrents`, `je-vais-comparer-les-tarifs-et-programmes-des-ecoles-de-votre-domaine`, `je-vais-auditer-la-visibilite-des-centres-de-sante-dans-votre-secteur`*

39. **Article 39 :**
    - **Titre :** *Formations éligibles CPF : comment analyser les programmes concurrents* (73 car.)
    - **Slug :** `formations-eligibles-cpf-analyse-programmes`
    - **Mot-clé primaire :** `formations éligibles CPF`
    - **Intention :** Benchmark pour organismes de formation certifiés Qualiopi.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-recenser-les-formations-eligibles-cpf-de-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-et-programmes-des-ecoles-de-votre-domaine`
      - `https://b2bpro.store/services/je-vais-auditer-la-visibilite-des-centres-de-sante-dans-votre-secteur`

40. **Article 40 :**
    - **Titre :** *Tarifs des écoles et organismes de formation : benchmark des prix 2026* (72 car.)
    - **Slug :** `tarifs-ecoles-organismes-formation-benchmark`
    - **Mot-clé primaire :** `tarifs des écoles de formation`
    - **Intention :** Aligner son offre pédagogique sur les prix du marché.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-et-programmes-des-ecoles-de-votre-domaine`
      - `https://b2bpro.store/services/je-vais-recenser-les-formations-eligibles-cpf-de-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-auditer-la-visibilite-des-centres-de-sante-dans-votre-secteur`

41. **Article 41 :**
    - **Titre :** *Visibilité des centres de santé : optimiser le parcours patient en ligne* (74 car.)
    - **Slug :** `visibilite-centres-sante-parcours-patient`
    - **Mot-clé primaire :** `visibilité des centres de santé`
    - **Intention :** Référencement local médical et prise de rendez-vous.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-auditer-la-visibilite-des-centres-de-sante-dans-votre-secteur`
      - `https://b2bpro.store/services/je-vais-recenser-les-formations-eligibles-cpf-de-vos-concurrents`
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-et-programmes-des-ecoles-de-votre-domaine`

---

### Pôle 13 : Logistique & Franchises (`logistique-franchises`)
*Services liés : `je-vais-recenser-les-franchises-en-expansion-dans-votre-secteur`, `je-vais-analyser-les-delais-et-couts-des-transporteurs-de-votre-zone`, `je-vais-cartographier-les-entrepots-et-zones-logistiques-disponibles`*

42. **Article 42 :**
    - **Titre :** *Franchises en expansion : comment trouver le réseau idéal où investir* (72 car.)
    - **Slug :** `franchises-expansion-trouver-reseau-investir`
    - **Mot-clé primaire :** `franchises en expansion`
    - **Intention :** Guide d'orientation pour futurs franchisés et repreneurs.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-recenser-les-franchises-en-expansion-dans-votre-secteur`
      - `https://b2bpro.store/services/je-vais-analyser-les-delais-et-couts-des-transporteurs-de-votre-zone`
      - `https://b2bpro.store/services/je-vais-cartographier-les-entrepots-et-zones-logistiques-disponibles`

43. **Article 43 :**
    - **Titre :** *Coûts des transporteurs de fret : négocier ses contrats d'expédition* (70 car.)
    - **Slug :** `couts-transporteurs-fret-negociation-contrats`
    - **Mot-clé primaire :** `coûts des transporteurs de fret`
    - **Intention :** Réduction des coûts logistiques amont et aval.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-les-delais-et-couts-des-transporteurs-de-votre-zone`
      - `https://b2bpro.store/services/je-vais-recenser-les-franchises-en-expansion-dans-votre-secteur`
      - `https://b2bpro.store/services/je-vais-cartographier-les-entrepots-et-zones-logistiques-disponibles`

44. **Article 44 :**
    - **Titre :** *Implantation d'entrepôt logistique : critères d'emplacement stratégique* (74 car.)
    - **Slug :** `implantation-entrepot-logistique-emplacement`
    - **Mot-clé primaire :** `entrepôt logistique emplacement`
    - **Intention :** Choix d'un hub de stockage régional et desserte autoroutière.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-cartographier-les-entrepots-et-zones-logistiques-disponibles`
      - `https://b2bpro.store/services/je-vais-analyser-les-delais-et-couts-des-transporteurs-de-votre-zone`
      - `https://b2bpro.store/services/je-vais-recenser-les-franchises-en-expansion-dans-votre-secteur`

---

### Pôle 14 : Grand Public & Quotidien (`grand-public`)
*Services liés : `je-vais-analyser-100-annonces-auto-pour-denicher-la-meilleure-affaire`, `je-vais-comparer-les-tarifs-des-auto-ecoles-de-votre-agglomeration`, `je-vais-recenser-les-aides-financieres-auxquelles-votre-foyer-a-droit`*

45. **Article 45 :**
    - **Titre :** *Acheter une voiture d'occasion : analyser 100 annonces sans se faire piéger* (76 car. → ajusté : *Acheter une voiture d'occasion : dénicher la bonne affaire*, 59 car.)
    - **Slug :** `acheter-voiture-occasion-denicher-bonne-affaire`
    - **Mot-clé primaire :** `acheter une voiture d'occasion`
    - **Intention :** Méthodologie d'élimination des vices cachés et surcotes.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-100-annonces-auto-pour-denicher-la-meilleure-affaire`
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-des-auto-ecoles-de-votre-agglomeration`
      - `https://b2bpro.store/services/je-vais-recenser-les-aides-financieres-auxquelles-votre-foyer-a-droit`

46. **Article 46 :**
    - **Titre :** *Tarifs des auto-écoles : comment comparer le permis de conduire en ville* (74 car.)
    - **Slug :** `tarifs-auto-ecoles-comparer-permis-conduire`
    - **Mot-clé primaire :** `tarifs des auto-écoles permis`
    - **Intention :** Éviter les heures supplémentaires dissimulées.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-des-auto-ecoles-de-votre-agglomeration`
      - `https://b2bpro.store/services/je-vais-analyser-100-annonces-auto-pour-denicher-la-meilleure-affaire`
      - `https://b2bpro.store/services/je-vais-recenser-les-aides-financieres-auxquelles-votre-foyer-a-droit`

47. **Article 47 :**
    - **Titre :** *Aides financières de l'État : comment recenser les droits de son foyer* (72 car.)
    - **Slug :** `aides-financieres-etat-recenser-droits-foyer`
    - **Mot-clé primaire :** `aides financières de l'État`
    - **Intention :** Détection de subventions et crédits d'impôt méconnus.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-recenser-les-aides-financieres-auxquelles-votre-foyer-a-droit`
      - `https://b2bpro.store/services/je-vais-comparer-les-tarifs-des-auto-ecoles-de-votre-agglomeration`
      - `https://b2bpro.store/services/je-vais-analyser-100-annonces-auto-pour-denicher-la-meilleure-affaire`

---

### Sujets Stratégiques Transverses (Pôles B2B / Francophonie / IA)

48. **Article 48 :**
    - **Titre :** *Prestataires digitaux en Afrique francophone : opportunités et garanties* (74 car.)
    - **Slug :** `prestataires-digitaux-afrique-francophone-garanties`
    - **Mot-clé primaire :** `prestataires digitaux Afrique`
    - **Intention :** Mettre en avant le pool d'experts certifiés (Sénégal, Cameroun, Côte d'Ivoire).
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`
      - `https://b2bpro.store/services/je-vais-convertir-n-importe-quel-site-en-base-de-connaissances-ia`
      - `https://b2bpro.store/services/je-vais-nettoyer-et-structurer-votre-fichier-excel-ou-csv-brut`

49. **Article 49 :**
    - **Titre :** *Escrow et paiement sécurisé B2B : comment fonctionne la retenue de fonds* (74 car.)
    - **Slug :** `escrow-paiement-securise-b2b-retenue-fonds`
    - **Mot-clé primaire :** `paiement sécurisé B2B escrow`
    - **Intention :** Éliminer le frein à l'achat et valoriser la protection acheteur de b2bpro.store.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`
      - `https://b2bpro.store/services/je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`
      - `https://b2bpro.store/services/je-vais-analyser-les-bilans-financiers-et-ratios-de-5-concurrents`

50. **Article 50 :**
    - **Titre :** *Micro-services B2B vs agences : pourquoi les PME changent de modèle* (70 car.)
    - **Slug :** `micro-services-b2b-vs-agences-pme-modele`
    - **Mot-clé primaire :** `micro-services B2B agences`
    - **Intention :** Comparatif prix/délais : 25 € en 48 h vs 3 000 € en 1 mois.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-analyser-le-profil-de-backlinks-de-vos-3-rivaux-majeurs`
      - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`
      - `https://b2bpro.store/services/je-vais-detecter-les-produits-en-rupture-de-stock-chez-vos-concurrents`

51. **Article 51 :**
    - **Titre :** *Fichier clients B2B et RGPD : comment enrichir ses contacts légalement* (73 car.)
    - **Slug :** `fichier-clients-b2b-rgpd-enrichissement-legal`
    - **Mot-clé primaire :** `fichier clients B2B RGPD`
    - **Intention :** Démystifier la prospection par email B2B en conformité CNIL.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-enrichir-vos-fichiers-clients-avec-les-donnees-societe-com`
      - `https://b2bpro.store/services/je-vais-vous-fournir-un-fichier-de-prospection-b2b-frais-et-verifie`
      - `https://b2bpro.store/services/je-vais-auditer-la-conformite-mentions-legales-et-rgpd-de-votre-site`

52. **Article 52 :**
    - **Titre :** *Optimiser son code promo pour les moteurs de recherche IA et comparateurs* (76 car. → ajusté : *Codes promo dans les IA : optimiser sa visibilité*, 52 car.)
    - **Slug :** `codes-promo-moteurs-ia-optimisation-visibilite`
    - **Mot-clé primaire :** `codes promo dans les IA`
    - **Intention :** Faire citer ses offres spéciales et coupons par ChatGPT et Copilot.
    - **Services à mailler :**
      - `https://b2bpro.store/services/je-vais-optimiser-votre-code-promo-pour-qu-il-ressorte-dans-les-ia`
      - `https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia`
      - `https://b2bpro.store/services/je-vais-analyser-les-prix-et-promotions-de-5-concurrents-e-commerce`

---

## ⚙️ Workflow Automatisé de Production d'un Nouvel Article

Pour publier l'un des articles ci-dessus :

1. **Rechercher les variantes et questions en temps réel :**
   ```bash
   pnpm run research:kw -- --query="<mot-cle-primaire>"
   ```
2. **Rédiger le fichier markdown dans `data/blog/<slug>.md`** en intégrant les H2, les réponses directes et les 3 liens `/services/` suggérés.
3. **Tester et insérer avec la porte de qualité :**
   ```bash
   pnpm dlx tsx --env-file=.env scripts/add-blog.ts --slug=<slug>
   ```
4. **Vérifier l'intégrité globale :**
   ```bash
   pnpm dlx tsx --env-file=.env scripts/check-integrity.ts
   ```
