# Journal des changements — b2bpro.store

> Toute implémentation est tracée ici, sans exception (voir `docs/REGRESSION-GUARD.md`).
> Types : `[ADDITIF]` extension sans toucher à l'existant · `[FORCE MAJEURE]` modification
> d'une implémentation existante (justifiée + protocole §5 de la charte) ·
> `[DONNÉES]` évolution du contenu/de la base · `[CORRECTIF]` correction de défaut.

---

## [2.6.0] — 2026-11-14 — Création de service directement depuis le panneau admin

> Demande client : permettre à l'admin de créer un service complet depuis le panneau,
> via une fonctionnalité robuste de bout en bout. Principe directeur : une fiche créée
> par le panneau doit PASSER LA GARDE D'INTÉGRITÉ par construction — le standard
> rédactionnel SGA™ est répliqué champ par champ côté client (panneau de conformité en
> direct), côté Zod (contrats) ET côté serveur (validateur miroir du garde-fou) : une
> fiche non conforme est refusée AVANT insertion, jamais de 503 d'intégrité après coup.

### [ADDITIF] — Contrats de création (schéma Zod + bornes éditoriales)
- `src/lib/contracts.ts` — `SERVICE_EDITORIAL_RULES` (miroir EXACT des contrôles
  services-content-standards / services-primary-wordcount / services-primary-unique /
  services-faq-first-comment / services-invariants du garde-fou) +
  `adminServiceCreateSchema` (titre 40-75, résumé 100-230, description ≥ 1000 avec
  H2/puces/answer-first, primaire 3-5 mots ancré dans le titre, secondaires/traîne/IA ≥ 3,
  FAQ ≥ 4 avec 1re question « comment… », points forts ≥ 4, livrables ≥ 3, étapes ≥ 3,
  options 0-8, note bornes 4,2-5,0, prix plancher 20 € pour protéger la promesse
  « dès 20 € ») + types `AdminServiceCreateInput` / `AdminServiceCreateResponse` /
  `AdminSellerOption` + action journal `SERVICE_CREATE`.

### [ADDITIF] — Logique serveur : validation miroir, slug/code canoniques, miniatures
- `src/lib/admin-service-create.ts` (nouveau) — funnel complet :
  pôle canonique (resolvePole) → vendeur (404 si inconnu) → validation éditoriale
  (MIROIR INTÉGRAL du garde-fou : mêmes regex/bornes) → unicité du primaire (409
  anti-cannibalisation avec la fiche porteuse citée) → slug auto (slugify du seed +
  suffixes anti-collision) → code `#NNN` (suite numérique du catalogue) → insertion
  TRANSACTIONNELLE service + options → miniatures par le GÉNÉRATEUR OFFICIEL
  (data/gen/thumbs.ts : 3 SVG « Éclat / Données / Épuré ») : écrites dans
  public/thumbs/ quand le FS est inscriptible (dev/self-hosted) ; sinon (Vercel
  read-only) data URIs dans Service.thumbUrls — fiche illustrée immédiatement, et
  contenus remis dans la réponse pour versionnement (runbook déploiement) →
  journal d'audit.
- `POST /api/admin/services` (extension additive de la route existante) — garde
  ensureAdmin (401), Zod (400), erreurs métier (400/404/409), succès 201.
- `GET /api/admin/sellers` (nouvelle route) — options du sélecteur (slug, nom, pays,
  niveau, note) enrichies des pôles de spécialité canoniques : le formulaire met les
  spécialistes du pôle choisi en tête.

### [ADDITIF] — Formulaire complet à conformité en direct (`/admin/services`)
- `src/components/admin/service-create-dialog.tsx` (nouveau) — dialog 10 sections
  guidées (identité, tarif, résumé générable, description SGA™ avec compteurs H2/
  puces/answer-first, mots-clés avec compteur de mots du primaire et ancrage titre,
  points forts/livrables, méthode par étapes, FAQ avec statut « comment… » et tailles
  de réponses, options additionnelles, preuve sociale initiale honnête) + PANNEAU DE
  CONFORMITÉ collant qui réplique les 17 contrôles du garde-fou en badges temps réel
  (soumission désactivée tant que non conforme — l'unicité du primaire reste serveur)
  + écran de récapitulatif après création (code, URL publique, 3 miniatures rendues,
  téléchargement des SVG en prod read-only, « créer un autre »).
- `src/app/admin/(panel)/services/page.tsx` — bouton « Créer un service » +
  intégration du dialog (rafraîchit la table après création). Aucune modification des
  fonctionnalités existantes (recherche, filtres, éditeur de tarif, rotation, switches).

### [ADDITIF] — Vérifications (E2E réel en navigateur)
- Parcours complet exécuté : 7 taps → login → /admin/services → formulaire rempli
  (fiche SGA™ complète conforme) → conformité verte → création → récapitulatif
  (#102, 3 miniatures) → fiche publique 200 + intégrée au sitemap → garde
  d'intégrité ok:true (114 services, 342/342 miniatures) → journal d'audit
  `service.create` → ROBUSTESSE : fiche non conforme rejetée 400 (« Titre : 40
  caractères minimum »), primaire déjà porté rejeté 409 (anti-cannibalisation) →
  service de test supprimé (base revenue à 113/339, garde verte), snapshot posé.
- Note runbook : après création EN PRODUCTION (FS read-only), télécharger les 3 SVG
  depuis le récapitulatif, les committer dans public/thumbs/ et re-déployer (les
  data URIs assurent l'affichage entre-temps).

### [DONNÉES] — Snapshot post-vérification
- `db/snapshots/snapshot-2026-11-14T11-35-17.json` — état nominal après validation
  (113 services ; le service de test E2E a été créé PUIS supprimé proprement).

---

## [2.5.0] — 2026-11-13 — Marque, accès admin discret, support routé par question, cycle de vie des commandes

> Demande client : logo conçu dans l'interface (fini le « B » simple), accès au panneau
> admin par 7 taps sur le logo + mot de passe Vercel, refonte du wording « prestataire
> unique » (la plateforme a de nombreux prestataires → support humain), réponse admin par
> email avec une route PAR question (aucun croisement client X/Y), carte de commande
> parfaitement structurée mobile/desktop (compte à rebours et indispensables), et la
> logique complète modification → validation du paiement → avis et note.

### [ADDITIF] — `BrandLogo` : le glyphe du favicon devient la marque d'interface
- `src/components/site/brand-logo.tsx` — SVG inline reprenant TRAIT POUR TRAIT le glyphe
  « b2b » du favicon officiel (public/favicon.svg) : net à toutes les tailles, zéro requête
  réseau, toujours synchrone avec l'icône d'onglet. Id de dégradé unique par instance
  (useId purgé des « : », NCName XML) — aucune collision url(#…).
- Remplacements du « B » simple : `SiteHeader` (desktop + sheet mobile),
  `AdminShell` (sidebar), `AdminLoginForm` (login admin).

### [ADDITIF] — Accès admin discret : 7 taps sur le logo de l'app
- `SiteHeader.handleLogoTap` — sept clics/taps espacés de ≤ 1 s ouvrent `/admin` :
  session admin vivante → panneau direct ; sinon → écran du mot de passe
  (`ADMIN_PASSWORD`, variable Vercel). Aucun indice visuel : un clic ordinaire navigue
  normalement vers l'accueil, les taps intermédiaires sont neutralisés (aucune navigation
  parasite). Feedback tactile discret (`active:scale-90`).
- `src/app/admin/login/page.tsx` — devient composant SERVEUR : session admin déjà valide
  → redirection immédiate `/admin` (le formulaire client vit dans `login-form.tsx`).

### [FORCE MAJEURE] — « Prestataire unique » devient « support humain » (cohérence place de marché)
- La plateforme réunit de nombreux prestataires : le fil de discussion ne peut plus se
  présenter comme « le propriétaire, prestataire unique » (contradictoire). Requalifié
  « Contacter le support humain » (équipe qui orchestre les prestataires) dans :
  `account/page.tsx`, `provider-chat.tsx`, `support/page.tsx`, `admin/messages`,
  `mailer.ts` (notifications), `api/support/thread`. La mécanique (fil par email de
  session) est inchangée — seul le discours change. Bulles signées « Support · ».

### [ADDITIF] — Route unique par question : la réponse ne peut jamais se croiser
- `SupportMessage.reference` (`Q-XXXXXX`, unique, alphabet sans ambigus) posé à la
  création de chaque question client (`POST /api/support/thread` retourne le code ;
  collision quasi impossible, 31^6 codes, 2 tentatives).
- `POST /api/admin/support/[id]` accepte `replyTo` (id de question) : VALIDÉ SERVEUR —
  404 si inconnue, 400 si elle appartient à un AUTRE fil (« répondez depuis le fil du
  client concerné, aucun envoi effectué »). Sans cible : la dernière question du fil.
- Email au client : objet « Réponse à votre question Q-XXXXXX — b2bpro.store » + rappel
  de la question — fil de discussion email propre par question. Aucune adresse email
  exposée (expéditeur = identité du site SMTP_FROM ; le client X ne voit jamais Y).
- Email d'alerte support : objet « Question Q-XXXXXX en attente », LIEN DIRECT
  `/admin/messages?thread=<id>` (deep-link : le fil s'ouvre automatiquement) + compteur
  de commandes du client.
- `/admin/messages` : deep-link `?thread=`, badges Q-XXXXXX sur les questions, clic sur
  une question → ciblage `replyTo` (indicateur « Répond à la question Q-… de <client> »,
  détachable), libellé d'envoi « exclusif à ce client ».
- `provider-chat.tsx` : badge de route sur chaque question + toast « route Q-XXXXXX ».

### [ADDITIF] — Cycle de vie des commandes : modification, livraison, validation, avis
- Prisma (SQLite + miroir Neon, poussé) : `Order.stage` (production | revision |
  delivered | completed), `deliveredAt`, `releasedAt`, modèle `OrderRevision` (motif,
  statut pending/resolved), `Review.orderId` (unique — un avis par commande),
  `SupportMessage.reference`. Colonnes purement additives (NULL sûr en Postgres).
- `OrderCard` (`components/site/account/order-card.tsx`) — carte structurée mobile →
  desktop : référence mono + badge de paiement ; fiche + options choisies ; méta
  (date, délai, montant, voie) ; **ligne de vie à 4 jalons** (payée → production/
  modification → livrée → validée) ; compte à rebours + **barre de progression** ;
  encarts d'état (modification en traitement avec motif, livrable prêt, terminée avec
  date de libération) ; actions contextuelles : Demander une modification (dialogue
  motivé), Valider la livraison (confirmation « libère les fonds »), Laisser note+avis.
- Routes client (garde : commande rattachée au Lead de l'email de SESSION) :
  `POST /api/orders/[reference]/revision` (PAID non complété → OrderRevision + étape
  revision + alerte URGENTE support + audit) ; `POST /api/orders/[reference]/validate`
  (uniquement depuis « delivered » → completed + releasedAt + revisions résolues +
  notification « paiement à libérer »).
- Routes admin (garde ensureAdmin) : `GET /api/admin/orders` (100 dernières, compteurs
  d'étapes) ; `POST /api/admin/orders/[reference]/deliver` (PAID production/revision →
  delivered + email au client « livrable prêt à valider » + audit).
- `POST /api/reviews` — `orderReference` optionnel : exige session + commande COMPLETED
  du client + pas d'avis existant → avis lié (`orderLabel` « Commande CMD-… »),
  moyenne du service recalculée. Sans `orderReference` : comportement public inchangé.
- `/admin/commandes` (nav « Commandes ») : pilotage support — liste avec badge d'étape,
  dernière demande de modification, compte à rebours hérité, bouton « Marquer livré ».
- `mailer.ts` : `notifyOwnerRevisionRequested` (urgent), `sendClientOrderDelivered`,
  `notifyOwnerOrderValidated` ; `notifyOwnerClientQuestion` enrichi (route + lien
  direct) ; `sendClientOwnerReply` référencé par question.

### [CORRECTIF] — `OrderCountdown` : boucle de rendu éliminée (Maximum update depth)
- `components/site/account/order-countdown.tsx` — la cible vivait en `new Date()` recréé
  à CHAQUE rendu dans les dépendances de l'effet → cascade setState/re-rendu illimitée
  dès qu'un parent re-rendait (ouverture de dialogue) sous React 19. Désormais
  millisecondes primitives (`Date.parse`) + formateur module-level. Latent depuis
  v2.2.0, neutralisé aujourd'hui où la carte re-rend à chaque interaction.

### [DONNÉES] — Bases
- SQLite local (`db:push`) et Neon Postgres (`db:push:pg`) synchronisés — colonnes
  additives uniquement, aucune donnée touchée (unicités NULL-sûres : les lignes
  existantes ont orderId/reference à NULL).
- `.env` local : `NEXTAUTH_SECRET` stable ajouté (les JWT de session se validaient
  mal entre redémarrages du serveur dev sans secret fixe — documenté dans .env.example).

### Vérification (E2E sur serveur dev, navigateur réel)
- Logo : SVG glyphe « b2b » présent (header, sheet mobile, sidebar admin, login).
- 7 taps logo → `/admin` (session vivante) ; clic simple → accueil ; `/admin/login`
  avec session → redirection `/admin`.
- Cycle complet vécu en réel : question support `Q-54WAJP` → deep-link admin → ciblage
  replyTo → réponse (200) → email « Réponse à votre question Q-54WAJP » tracé → bulle
  « Support · » côté client. Commande `CMD-E2ECYCLE` : demande de modification (bannière
  + motif) → « Marquer livré » (admin, email client tracé) → validation client (fonds
  libérés, bannière terminée) → avis 5★ lié à la commande persisté (moyenne recalculée).
- Aucune erreur console/page sur tous les parcours ; zéro « prestataire unique »
  résiduel côté client ; footer présent, mobile 390×844 sans débordement horizontal ;
  lint impeccable.

---

## [2.4.1] — 2026-11-13 — Route de test Web Push réellement créée + clés VAPID posées + Neon vérifié

> Suite de v2.4.0 : son entrée annonçait « POST /api/push/test (garde
> ensureAdmin) » et « clés VAPID générées et posées dans .env » — or la route
> n'existait pas (404) et `.env` ne contenait que DATABASE_URL. Cette version
> boucle le bout en bout réel, avec les identifiants Neon fournis par le client.
>
> [v2.5.1] Cette entrée a été restaurée : un reset environnemental avait fait
> disparaître le commit d'origine (route non versionnée à cause du motif gitignore
> nu `test`, .env revenu vierge) — fichiers, clés et correctifs reposés à
> l'identique, vérification E2E refaite.

### [CORRECTIF] — `POST /api/push/test` : la route documentée, enfin réelle
- `src/app/api/push/test/route.ts` — notification d'essai (garde `ensureAdmin`,
  401 sans session) : rapport `{ sent, failed, purged }` après `sendPushToAll`
  (les endpoints morts 404/410 sont purgés par la même occasion) ; 503 explicite
  si VAPID absent de l'environnement ; base vide → `{ sent: 0 }` (tout est câblé,
  personne n'est abonné sur CET environnement).
- `.gitignore` — le motif nu `test` avalait tout dossier nommé « test », y
  compris cette route API (elle n'aurait jamais pu être versionnée) ; ancré en
  `/test` (brouillon racine uniquement) : aucun chemin applicatif légitime n'est
  plus avalé, aucun fichier suivi n'était couvert par l'ancien motif.

### [ADDITIF] — Clés VAPID générées et posées dans `.env` local
- Paire P-256 via `bunx web-push generate-vapid-keys --json` + sujet
  `mailto:contact@b2bpro.store` : `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
  `VAPID_SUBJECT` (fichier ignoré par git — les valeurs ne sont jamais
  versionnées). En production : les poser dans Vercel → Settings →
  Environment Variables (Production ET Preview) puis **Redeploy** — sans elles,
  `/api/push/public-key` répond `null` et tout se dégrade proprement vers les
  notifications locales du service worker.
- `NEON_DATABASE_URL` posé dans `.env` (chaîne « pooled » du runbook, jamais
  versionnée) : cible de `db:push:pg` / `db:migrate:neon`, sans jamais toucher au
  `DATABASE_URL` SQLite local.

### [DONNÉES] — Neon vérifié en synchro ; migration de données ÉCARTÉE à raison
- `db:push:pg` : schéma Postgres « already in sync », table `PushSubscription`
  conforme (index unique `endpoint`), prête et vide. `db:migrate:neon`
  volontairement NON lancé : la base Neon de production est EN AVANCE sur
  l'instantané local SQLite (commandes et comptes réels plus récents) — le
  refresh complet (purge + copie) aurait détruit des données vivantes.
- Aucune donnée de contenu touchée (`bun run guard` : 19 contrôles, 0 échec).

### Vérification
- E2E sur le serveur dev : abonnement crypto-valide → upsert idempotent (1
  ligne SQLite, aucun doublon au 2e POST) ; `/api/push/test` sans session :
  401 ; avec session admin : `{ ok, sent: 0, failed: 0, purged: 1 }` — la
  signature VAPID est ACCEPTÉE par le service push (endpoint factice déclaré
  mort → purgé sur-le-champ : c'est le chemin d'assainissement qui est prouvé) ;
  `unsubscribe` idempotent sur un endpoint déjà disparu.
- Navigateur réel : page rendue sans erreur console, service worker ACTIF
  (scope `/`), `/api/push/public-key` sert la clé réelle, `sw.js` 200 — et
  l'invite d'installation v2.3.0 visible à l'écran (le régisseur `prompt-hub`
  coordonne toujours les deux invites : jamais ensemble).

---

## [2.4.0] — 2026-11-14 — Notifications navigateur intelligentes, coordonnées avec l'installation de l'App

> Demande client : fonctionnalité de notification sur navigateur « intelligente
> et non intrusive, invitation bienveillante à s'inscrire aux notifications
> sans paraître trop intrusif, bon accord d'apparition de ce composant avec
> celui de l'installation de l'App pour ne pas spammer l'utilisateur, animation
> immersive, élégante et moderne lors de l'apparition ».

### [ADDITIF] — Régisseur d'attention : UN créneau pour les deux invites
- `src/lib/prompt-hub.ts` — l'invite d'installation (v2.3.0) et l'invite de
  notifications (v2.4.0) ne sont jamais à l'écran ensemble : `acquirePrompt`
  occupe le créneau, `releasePrompt` le libère en horodatant la fermeture,
  `withinSpacing` applique une fenêtre de **courtoisie de 60 s** après TOUTE
  fermeture (la seconde invitation attend, même si ses propres conditions
  sont réunies). Store externe via `useSyncExternalStore` : les deux composants
  réagissent instantanément, hub purement mémoire (chaque ouverture de l'app
  repart à zéro, les règles persistées tranchent ensuite).
- `PwaClient` (refonte du seul bloc de décision) — l'installation garde sa
  priorité naturelle (Chromium arme `beforeinstallprompt` tôt) ; si le
  créneau est pris ou en courtoisie, elle attend : évaluation à chaque
  changement de créneau + filet périodique de 5 s (la fin d'une courtoisie
  n'émet aucun événement observable). Sémantique v2.3.0 intacte : refusée une
  fois, l'invite d'installation ne revient plus de toute la session.

### [ADDITIF] — `NotificationPrompt` : l'invitation bienveillante
- `src/components/site/notification-prompt.tsx` (layout racine, après
  `PwaClient`) — sœur visuelle de l'invite d'installation : même carte centrée
  arrondie 24 px, même **fond flouté** (backdrop-blur + voile 40 %, `z-[70]`),
  même famille de boutons/croix. Titre sobre : « Rester informé ? », promesse
  en une ligne : « Suivi de vos commandes et réponses clés. Rien d'autre. »,
  bouton plein « Activer » + « Plus tard » discret + croix.
- Animation d'entrée immersive (Framer Motion, première utilisation du projet)
  : médaille cloche émeraude qui « sonne » en pulsations concentriques
  continues, textes puis boutons qui montent en cascade (ressorts ~350 ms,
  flou qui se dissipe), sortie douce du Dialog Radix.
- Intelligence d'apparition (« non intrusif » par construction) :
  1) **jamais avant un vrai engagement** : 40 s de présence + 3 interactions,
  ou 3 pages vues + 15 s + 2 interactions (visiteur qui explore) ;
  2) **jamais si le navigateur a déjà tranché** (permission accordée ou
  refusée dans les réglages du site : on s'incline sans rien demander) ;
  3) **jamais en même temps ni juste après l'autre invite** (régisseur :
  créneau unique + courtoisie 60 s) ;
  4) **jamais sur `/admin` ni `/api`** ;
  5) **refus poli respecté et escaladant** : 48 h, puis 7 jours, puis 30 jours
  de silence (localStorage `b2bpro-notif-prompt`) ; refus au niveau du
  NAVIGATEUR (« Activer » puis non dans le dialogue natif) : statut
  `blocked` définitif, l'invite ne se représente plus jamais ;
  6) horloge de décision à 1 Hz : la fin d'un cooldown ou d'une courtoisie
  est détectée sans attendre le moindre geste du visiteur.

### [ADDITIF] — Web Push : abonnement réel + envoi serveur
- `public/sw.js` (v2.4.0, `VERSION = "b2bpro-v2"`) — gestionnaires `push`
  (charge utile `{ title, body, url, tag }`, repli sobre si message brut ou
  vide) et `notificationclick` (fenêtre existante focalisée + navigation vers
  l'URL utile du message, sinon `openWindow`). Les notifications LOCALES de
  confirmation transitent par le même canal visuel.
- Prisma — modèle `PushSubscription` (endpoint unique, clés `p256dh`/`auth`,
  user-agent, horodatages) sur les DEUX schémas (SQLite + miroir Postgres
  Neon) ; `bun run db:push` local exécuté, le garant `ensure-neon-schema.ts`
  crée la table côté prod au prochain déploiement (§0 du runbook).
- `src/lib/push.ts` — envoyeur Web Push VAPID (`web-push`), `sendPushToAll`
  avec assainissement : endpoint mort (404/410) retiré sur-le-champ, la base
  ne garde que des destinataires vivants.
- Routes API : `GET /api/push/public-key` (clé publique, `{ publicKey: null }`
  si VAPID absent : tout se dégrade proprement) ; `POST /api/push/subscribe`
  (upsert idempotent sur l'endpoint, validation stricte) ;
  `POST /api/push/unsubscribe` (idempotent) ; `POST /api/push/test`
  (notification d'essai, **garde `ensureAdmin`** : propriétaire uniquement).
- Activation complète côté client : permission native → abonnement
  `pushManager` (clé VAPID décodée base64url → `Uint8Array`) →
  `POST /api/push/subscribe` → notification de confirmation affichée par le
  service worker + toast (« activées et synchronisées » / « activées sur cet
  appareil » si Web Push indisponible).
- Dépendance `web-push` (+ `@types/web-push`) ; clés VAPID générées et posées
  dans `.env` local (jamais versionnées : `.env` est ignoré par git).

### [DONNÉES] — Aucune donnée de contenu touchée
- Création de la seule table `PushSubscription` (vide au départ) : aucune
  migration de contenu, aucun service/avis/article modifié.

### Vérification (navigateur réel, golden path complet)
- Invite d'installation prioritaire (créneau libre, flou actif), puis refus →
  **aucune invite pendant la fenêtre de courtoisie** ; engagement non réuni
  (temps/interactions) → l'invite notifications **n'apparaît pas** ; après
  engagement + expiration de la courtoisie → apparition au message près
  (« Rester informé ? / Activer / Plus tard ») ; « Plus tard » → cooldown 48 h
  persisté + silence à 8 s ET après rechargement complet ; « Activer » refusé
  au niveau navigateur → statut `blocked`, refermeture immédiate, plus jamais
  relancée. Console et page : zéro erreur. Routes push : 200 idempotents,
  garde admin 401, clé publique servie.

---

## [2.3.0] — 2026-11-13 — PWA : application installable sur l'écran d'accueil

> Demande client : support PWA « parfaitement fonctionnel pour qu'elle soit
> installable sur l'écran d'accueil », avec une invite « élégante, moderne,
> 3 ou 4 mots au plus », qui « floute l'arrière-plan afin que l'attention soit
> concentrée sur lui », offrant « installer ou fermer », et qui « ne
> s'affichera plus qu'à la prochaine ouverture de l'App ».

### [ADDITIF] — Service worker (la pièce manquante de l'installabilité)
- `public/sw.js` — Chrome/Edge/Android exigent un SW actif AVEC gestionnaire
  `fetch` avant d'émettre `beforeinstallprompt` : il manquait, le manifeste
  était orphelin. Stratégies conservatrices (catalogue dynamique oblige) :
  navigations réseau d'abord puis repli sur la copie en cache puis
  `/offline.html` ; assets statiques (`/_next/static`, `/thumbs`, `/avatars`,
  `/icons`) cache d'abord + revalidation ; `/api` et `/admin` JAMAIS servis du
  cache. Pré-cache tolérant à l'install (identité de l'app + repli), purge des
  caches obsolètes à l'activation, `skipWaiting` + `clients.claim`.
- `public/offline.html` — repli hors-ligne statique (zéro dépendance réseau),
  marque émeraude, noindex, bouton « Réessayer ».

### [ADDITIF] — `PwaClient` : enregistrement + invite d'installation
- `src/components/site/pwa-client.tsx` (rendu du layout racine) — enregistre
  `/sw.js`, puis n'apparaît QUE si le navigateur a réellement décidé que
  l'app est installable (`beforeinstallprompt`) et qu'elle n'est pas déjà
  installée (mode standalone détecté) ni refusée cette session.
- L'invite : Dialog Radix (composants existants + primitives), fond flouté
  réel (backdrop-blur 12 px + voile 40 %, `z-[70]` : au-dessus de la bannière
  d'annonce z-60 et du header z-50, sous les toasts z-100 — le flou couvre
  TOUT le chrome, bannière comprise), carte 24 px arrondie centrée :
  icône b2b émeraude, titre « Installer l'application » (3 mots), ligne marque
  « b2bpro.store », bouton plein « Installer » (icône téléchargement), croix
  « Fermer ». Apparition différée 900 ms (laisse la page respirer).
- Sémantique de session (`sessionStorage`) : fermée (croix, Échap, clic
  au-dehors) ou tranchée par le dialogue natif → silence TOTAL jusqu'à la
  prochaine ouverture de l'app ; ré-émissions de l'événement au cours de la
  session restent muettes ; `appinstalled` enterre définitivement.
- iOS : Safari n'émet pas l'événement → l'invite reste silencieuse par
  conception ; l'installation passe par Partage → « Sur l'écran d'accueil »
  (apple-touch-icon + manifeste, satisfaits).

### [ADDITIF] — Manifeste et métadonnées complétés
- `public/site.webmanifest` — `id` et `scope` racine, + icônes MASKABLE
  192/512 (`public/icons/maskable-*.png`, glyphe dans le cercle sûr 80 %) :
  Android peut rogner selon la forme de l'icône d'accueil sans rien perdre.
- `scripts/gen-favicon.ts` (`bun run gen:favicon`) — génère désormais les 2
  variantes maskable (source de vérité unique, idempotent).
- `src/app/layout.tsx` — `viewport` export (themeColor #059669 pour la barre
  installée, viewportFit cover pour les zones de sécurité iOS) ;
  `src/lib/site.ts` — `appleWebApp` (plein écran standalone iOS, titre, barre
  d'état) : Next rend `mobile-web-app-capable` + `apple-mobile-web-app-title`
  + `apple-mobile-web-app-status-bar-style`.

### Vérification (navigateur headless, tout re-testé)
- SW ACTIF (scope racine, activated, contrôle la page) ; pré-cache complet
  (offline.html, manifeste, favicon, logo, 4 icônes) ; routes 200.
- Balises : `<link rel=manifest>`, `<meta name=theme-color content=#059669>`,
  `mobile-web-app-capable=yes`, `apple-mobile-web-app-title=b2bpro.store`.
- Invite (événement synthétique) : flou réel blur(12px) + voile 40 %,
  bannière d'annonce couverte (VLM : « aucun texte lisible derrière »),
  z-index 70 > bannière 60 ; cycle de vie complet VERT : ouverture →
  « Installer » → fermeture + drapeau session → re-diffusion MUETTE →
  session nouvelle → réapparition → croix → fermeture + drapeau.
- Mobile 375 px : carte 320×258, aucun débordement, overlay couvrant ;
  design noté ~9/10 par analyse visuelle ; 0 erreur console ; lint 0 erreur ;
  garde 19 contrôles verts.

---

## [2.2.2] — 2026-11-13 — Zéro cadratin dans tout le HTML crawlable (gabarits alt)

> Complément de la vérification v2.2.1 : après correction des FAQ en base,
> l'inspection du HTML rendu révélait des « — » résiduels — exclusivement dans
> les attributs alt des miniatures, hors de portée de l'audit base (qui vérifie
> le contenu des fiches, pas les gabarits des composants).

### [CORRECTIF] — Gabarits alt des miniatures : « — » → «, »
- `service-card.tsx` / `service-gallery.tsx` — « {titre} — miniature » devient
  « {titre}, miniature » : les 113 alt de chaque page de catalogue, plus ceux
  de la galerie de fiche, n'émettent plus aucun cadratin. Vérifié à 0 sur fiche
  service, accueil, catalogue et article rendus.
- Documentation : le runbook (`docs/DEPLOIEMENT-VERCEL.md`) gagne la section
  « Hygiène FAQ : zéro tiret cadratin » avec la commande de production
  `NEON_DATABASE_URL="postgresql://…sslmode=require" bun run fix:faq-emdash`.

---

## [2.2.1] — 2026-11-13 — Audit élite SEO/GEO/AIO intégralité verte (1799 contrôles)

> Demande client : « vérifications SEO, AIO, GEO afin de nous rassurer
> véritablement que nos services et articles sont de véritables bêtes de
> référencement, citées dans les réponses IA avec liens directs, optimisées
> pour ventes incitatives ».

### [DONNÉES] — Hygiène typographique : 13 cadratins « — » retirés des FAQ
- L'audit élite (`bun run audit:seo`) révélait 14 échecs : 13 fiches portaient
  un cadratin (typographie mécanique « trop IA ») dans UNE même réponse FAQ de
  séquestration, là où 46 occurrences de référence écrivent « feu vert : le
  vendeur… » (deux-points typographique français). Le 14e échec
  (`llms-full.txt : 13 cadratins`) provenait des mêmes FAQ (génération directe).
- `scripts/fix-faq-emdash.ts` (`bun run fix:faq-emdash`) : correctif chirurgical
  et idempotent, mode local Prisma + mode production Neon via
  `NEON_DATABASE_URL` (même convention que `emojis:clean`). Production :
  `NEON_DATABASE_URL="postgresql://…sslmode=require" bun run fix:faq-emdash`.

### Vérifications livrées (toutes vertes)
- `bun run audit:seo` : **113 services · 12 articles · 1799 contrôles · 0 échec**
  (45 avertissements seo-density non bloquants — choix éditorial anti
  keyword-stuffing assumé). Rapport versionné
  `docs/audits/audit-seo-geo-aio-2026-11-13.md`.
- `bun run guard` : 19 contrôles, aucun échec (standards rédactionnels SGA™,
  anti-cannibalisation, activateurs GEO, maillage blog).
- Rendu réel vérifié par fiche : title optimisé (mot-clé + prix + marque),
  canonical absolu, Open Graph complet, `robots: index, follow`, 5 blocs
  JSON-LD valides (Service + Offer + AggregateRating, Product, FAQPage,
  BreadcrumbList) portant chacun l'URL canonique directe de la fiche.
- Cohérence AIO prouvée : le bloc « Réponse rapide » du HTML et la ligne
  « RÉPONSE DIRECTE » de llms-full.txt sont identiques mot pour mot (une seule
  voix — condition de citation par les moteurs de réponse IA).
- Protocoles crawlables : `robots.txt` autorise explicitement 18 crawleurs IA
  (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended…) ;
  `llms.txt` (113 URLs directes) ; `llms-full.txt` (113 RÉPONSE DIRECTE au
  format canonique, 526 Ko) ; `sitemap.xml` (176 URLs, 100 % apex).
- Blog : Article JSON-LD, canonical, 3 à 6 liens absolus par article vers les
  fiches services (maillage incitatif d'achat).
- Incitation à l'achat : CTA « Commander maintenant » en ancre de tunnel,
  chiffres clés visibles (dès X € · délai · note/avis · ventes), paiement
  séquestré expliqué partout, prompt du chat IA strictement fidèle à la fiche
  et clos sur une invitation naturelle à commander.

---

## [2.2.0] — 2026-11-13 — Prestataire humain, notifications propriétaire, tarifs pilotables

> Demandes client : (1) discuter avec un vrai interlocuteur (le propriétaire,
> notifié de façon urgente), (2) l'email configuré en environnement notifié
> pour chaque commande, chaque conversation prestataire IA et toute transaction
> décisive, (3) dashboard client avec compte à rebours et historique des
> commandes, (4) tarifs des services modifiables par l'admin.

### [DONNÉES] — Modèles `SupportThread` / `SupportMessage` (les DEUX schémas)
- Un fil unique par email de client connecté (identité vérifiée de session) ;
  `unreadForOwner` alimente le badge « Messages clients » du panneau admin ;
  les questions (ré)ouvrent le fil, une réponse du propriétaire le relance.

### [ADDITIF] — Notifications email du propriétaire (`src/lib/mailer.ts`)
- `OWNER_EMAIL` (repli `SMTP_USER`) reçoit : chaque nouvelle commande
  (PayPal + voie démo), chaque paiement capturé (transaction décisive), chaque
  nouvelle conversation avec l'assistant prestataire IA, chaque question client
  au prestataire humain (priorité haute, préfixe [URGENT]).
- Règle d'or respectée : aucun envoi ne peut faire échouer l'action métier
  (aucune fonction ne lève ; délais SMTP bornés 8 s/12 s ; en dev sans SMTP le
  contenu part en trace console dans dev.log, comme le lien magique).
- La notification IA part EN PARALLÈLE de la génération LLM (aucune latence
  ajoutée au visiteur), l'envoi restant garanti avant la réponse HTTP.

### [ADDITIF] — Conversation humaine client ↔ propriétaire
- `/api/support/thread` (GET fil + POST question, session exigée, anti-abus
  10 msg/min/IP) ; chaque question : email URGENT + trace
  `support.message` au journal d'audit → badge `/admin/messages`.
- Espace client (`/account`) : rubrique « Discuter avec le prestataire »,
  actualisation 20 s + à la reprise de focus de l'onglet ; CTA « Un humain ? »
  ajouté sur `/support`.
- Panneau admin : page « Messages clients » (liste, lecture = remise à zéro du
  compteur, réponse → email au client + espace, clôture/réouverture) et badge
  rouge de non-lus dans la navigation (interrogé toutes les 45 s).

### [ADDITIF] — Dashboard client : compte à rebours des commandes
- `OrderCountdown` — livrable promis à `paidAt + délai` (seconde par seconde,
  rendu hydratation-safe) sur chaque commande payée de `/account`, avec lien
  « Une question sur cette commande ? Écrire au prestataire » par commande.

### [ADDITIF] — Tarifs des services modifiables par l'admin
- `adminServicePatchSchema` accepte `basePrice` (1 à 100 000 €, deux décimales) ;
  `PATCH /api/admin/services/[id]` applique + journalise « tarif X € → Y € » ;
  édition en place dans /admin/services (Entrée enregistre, Échap annule).
- Sécurité inchangée : le total de commande est TOUJOURS recalculé serveur
  depuis la base — le tarif modifié s'applique immédiatement partout.

---

## [2.1.3] — 2026-11-12 — Connexion Google réparée en production (?error=Callback)

> Constat client : « l'authentification par Google tourne et revient non
> authentifiée » avec `/?…&error=Callback`. Cause racine trouvée et PROUVÉE :
> l'index unique composé `@@unique([provider, providerAccountId])` manquait
> sur le modèle `Account` des DEUX schémas Prisma — l'adaptateur NextAuth
> interpole `provider_providerAccountId` dès `getUserByAccount` (premier geste
> du rappel Google) → `PrismaClientValidationError` → NextAuth redirige en
> `?error=Callback`. Reproduit localement puis corrigé et re-testé.

### [CORRECTIF] — Index unique composé sur Account (la cause racine)
- `prisma/schema.prisma` + `prisma/schema.postgres.prisma` —
  `@@unique([provider, providerAccountId])` ajouté (l'exigeance de
  l'adaptateur officiel `@next-auth/prisma-adapter`). Le lien magique
  n'était pas touché (il n'utilise jamais `Account`) — d'où un symptôme
  « Google seul » qui a guidé le diagnostic.

### [CORRECTIF] — Rattrapage DDL sans `--accept-data-loss` (production)
- `scripts/ensure-neon-schema.ts` (v2.1.3) — avant le `db push` du build,
  `CREATE UNIQUE INDEX IF NOT EXISTS` via `prisma db execute` : purement
  additif, idempotent. `db push` voit ensuite le schéma conforme et n'exige
  JAMAIS la confirmation interactive (qui échouerait sur Vercel) — le flag
  `--accept-data-loss` reste proscrit (risque destructif sur des données réelles).

### [ADDITIF] — Liaison de comptes Google ↔ email
- `src/lib/auth.ts` — `allowDangerousEmailAccountLinking: true` sur Google :
  sûr ici (Google vérifie lui-même la propriété de l'adresse ; notre lien
  magique exige l'accès à la même boîte) — supprime le cul-de-sac
  `OAuthAccountNotLinked` pour un client qui a d'abord utilisé le lien magique.

### [ADDITIF] — Les erreurs d'auth parlent français
- `src/components/site/auth-menu.tsx` — un échec de connexion atterrit
  désormais avec un toast FR actionnable (9 codes traduits) + URL nettoyée
  (`?error`/`?callbackUrl` retirés). Avant : retour MUET sur l'accueil.

### [ADDITIF] — Sonde « Tables d'authentification » dans /admin
- `/api/admin/stats` + bandeau du tableau de bord : état des 4 tables
  NextAuth (vert = conforme ; rouge = Redeploy requis, le garant du build
  répare). Visible en production via `/admin`.

> Traçabilité des versions intermédiaires : [2.1.1] correctif tunnel PayPal
> (hauteur de bouton en NOMBRE — le SDK/React 19 rejetait `"45"` chaîne,
> crash vérifié au navigateur puis corrigé) · [2.1.2] doc PayPal (piège
> Sandbox/Live, test curl = juge de paix).

---

## [2.1.0] — 2026-11-12 — Authentification imposée à la finalisation de commande

> Faisait suite au constat client : « j'ai pu finaliser une commande sans que
> l'authentification ne me soit imposée ». Déployée APRÈS la réparation de
> l'auth en production (v2.0.2 : tables Neon créées au build Vercel) — jamais
> l'inverse, pour ne pas fermer la porte sans avoir la clé.

### [FORCE MAJEURE] — La commande exige un client connecté (serveur-autoritaire)
- `src/lib/auth.ts` — `isAuthRequiredForOrders()` : true dès que l'auth est
  configurée sur l'environnement (Google ou lien magique). Escape hatch de
  test : `ORDER_ALLOW_GUEST=true` rétablit les commandes invité SUR CET
  environnement uniquement.
- `POST /api/orders` et `POST /api/paypal/create-order` : session exigée
  AVANT toute logique — sans session → **401** avec message FR actionnable.
  L'email du lead devient l'email de **SESSION** (identité vérifiée par Google
  ou par clic sur le lien email) : plus d'email fantôme saisi à main levée,
  plus de lead impossible à tracer. Le nom de session prime pareillement.
- Justification : traçabilité des commandes + protection séquestre (on ne
  séquestre que des paiements dont on connaît le propriétaire) + suivi
  garanti dans `/account`.

### [ADDITIF] — Panneau « connexion requise » dans le tunnel (face UI du garde)
- `order-dock.tsx` : à l'étape coordonnées, si session absente, le formulaire
  est remplacé par un panneau « Une connexion protège votre commande » (bouton
  → dialogue de connexion empilé, sélection conservée, retour arrière vers
  les options). Garde local doublon dans `placeOrder`/`goToPayment`.
- `auth-menu.tsx` : `SignInDialog` exporté (réutilisé par le tunnel).

### [CORRECTIF] — Diagnostic/production
- `scripts/ensure-neon-schema.ts` + `vercel.json` : le schéma Postgres est
  appliqué à Neon au DÉBUT de chaque build Vercel (idempotent, sans
  `--accept-data-loss`, échec non bloquant, réveil P1001 ×3) — répare
  l'oubli historique qui cassait `/api/auth/signin/email` (500) et le
  callback Google en production.
- `command.tsx` : `DialogHeader` (titre + description sr-only) déplacé DANS
  `DialogContent` — Radix lie enfin `aria-describedby` (fin du warning
  « Missing Description for DialogContent »).

---

## [2.0.0] — 2026-11-11 — Commande persistante, tunnel à options, authentification Google + email

### [ADDITIF] — Barre de commande persistante sur les fiches service
- `src/components/site/order-dock.tsx` : barre `sticky bottom-0` — total en
  direct + bouton « Commander » ancré au bas de l'écran pendant TOUTE la
  lecture de la fiche ; se range naturellement au-dessus du footer en fin de
  page (aucun recouvrement du footer, aucune friction mobile).
- `src/lib/order-store.ts` (zustand) : source unique de la sélection
  d'options partagée carte latérale ↔ barre ↔ tunnel.

### [ADDITIF] — Tunnel de commande en 3 étapes, options FACULTATIVES
1. « Composez votre commande » : offre de base incluse + options cochables
   ou décochables (total et délais recalculés en direct) — « rien n'est imposé » ;
2. coordonnées : préremplies si le client est connecté (sinon saisie classique) ;
3. paiement PayPal (production, SDK JS + capture serveur — logique reprise à
   l'identique de l'ancien `OptionSelector`) ou validation voie démo
   `/api/orders`.
- `option-selector.tsx` recentré sur la carte latérale (sélection + total) ;
  le dialogue et le tunnel vivent dans `OrderDock`.

### [ADDITIF] — Authentification clients : Google + lien magique email
- `src/lib/auth.ts` (NextAuth v4, sessions JWT + adaptateur Prisma) :
  - Google OAuth (activé par `GOOGLE_CLIENT_ID/SECRET`, sélecteur de compte) ;
  - email par **lien magique 24 h** (nodemailer, Gmail via mot de passe
    applicatif : `SMTP_HOST/PORT/USER/PASSWORD`) ; email HTML francophone ;
  - sans SMTP en dev → lien tracé dans `dev.log` (parcours testable) ; en
    production sans SMTP → bouton email masqué (jamais d'échec visible).
- Route `src/app/api/auth/[...nextauth]/route.ts`.
- Modèles Prisma `User/Account/Session/VerificationToken` (SQLite + miroir
  Postgres), `db:push` local exécuté.
- `SessionBoundary` au layout racine ; `auth-menu.tsx` : dialogue de connexion
  (Google 1 clic / lien magique) + menu utilisateur (avatar, /account,
  déconnexion) dans le header ; disponibilité des méthodes calculée côté
  serveur (layout public) — boutons absents si non configurés.
- Page `/account` : profil + commandes du compte (statuts FR, noindex).

### [ADDITIF] — `/api/orders` persiste désormais une ligne Order (voie démo)
- La voie démo crée aussi l'enregistrement `Order` (`paymentProvider: "demo"`,
  `paymentStatus: "CREATED"`, même référence `CMD-…`) : le client connecté
  retrouve sa commande dans `/account`. La voie PayPal reste inchangée.

### [DONNÉES] — Variables d'environnement nouvelles
- `NEXTAUTH_SECRET` (+ `NEXTAUTH_URL` dev), `GOOGLE_CLIENT_ID/SECRET`,
  `SMTP_HOST/PORT/USER/PASSWORD/FROM` — documentées dans `.env.example` et
  `docs/AUTHENTIFICATION-GOOGLE-EMAIL.md` (guide pas-à-pas débutant, 15 min).

### [CORRECTIF] — Assistant IA de fiche surélevé
- Le bouton flottant du chat IA passe au-dessus de la barre persistante
  (`raiseAboveDock`) : plus aucun chevauchement sur mobile.

---

## [1.10.1] — 2026-11-11 — Correctif de production : le chat IA ne renvoie plus jamais d'erreur 500

Défaut constaté par l'utilisateur : `POST /api/service-chat` renvoyait **500** en
production (Vercel) malgré l'ajout de la clé DeepSeek et un redéploiement.

### [CORRECTIF] — Cause racine de l'erreur 500
- `ZAI.create()` (SDK z-ai-web-dev-sdk) lit sa configuration depuis un FICHIER
  `.z-ai-config` (cwd / home / /etc) — **aucune variable d'environnement**. Ce
  fichier n'existe que dans l'environnement de développement : sur Vercel,
  `ZAI.create()` lève TOUJOURS « Configuration file not found ».
- Enchaînement fatal : appel DeepSeek en échec (clé absente, mal nommée, mal
  collée, invalide, solde insuffisant…) → repli z-ai → exception z-ai non
  interceptée dans `generateChatReply` (v1.10.0) → catch de la route → 500.

### [FORCE MAJEURE] — `src/lib/ai-provider.ts` : chaîne incassable
- `generateChatReply` ne lève **jamais** d'exception : DeepSeek puis z-ai sont
  chacun enveloppés ; si les deux échouent, la fonction renvoie
  `{ reply: null, provider: "indisponible", error }` — l'appelant sert son
  propre repli déterministe. Chaque échec est journalisé (`console.error`) et
  mémorisé pour le diagnostic.
- Timeout DeepSeek resserré à **12 s** (l'ancien 30 s pouvait dépasser la limite
  des fonctions Vercel et provoquer un 500 de plateforme avant le repli).
- Nouveau `getChatProviderDiagnostics()` : présence/format de la clé DeepSeek,
  modèle, disponibilité z-ai — **aucun secret divulgué** (booléens uniquement).
- Nouveau `pingDeepSeek()` : vérification LIVE de la clé (1 token consommé) —
  distingue clé invalide (401), solde insuffisant (402), réseau bloqué.

### [FORCE MAJEURE] — `POST /api/service-chat` : plus jamais de 500 au visiteur
- Si DeepSeek ET z-ai sont tous deux injoignables, la route répond **200** avec
  une réponse locale **déterministe** construite sur les chiffres exacts de la
  fiche : FAQ de la fiche d'abord (réponse vérifiée), puis matching lexical par
  intention (prix, délais, inclus/livrables, garanties, options, vendeur), puis
  réponse générique orientée gains — persona identique au prompt système
  (convivial, rassurant, bref, gain chiffré, invitation douce), zéro invention.
- `export const maxDuration = 30` : marge Vercel pour la chaîne complète
  DeepSeek → repli (le défaut ~10 s coupait la route avant la fin du repli).
- **Nouveau GET /api/service-chat** : diagnostic public de configuration
  (`diagnostics.deepseek.keyPresent`, `keyFormatOk`, `model`, z-ai…) +
  `?ping=1` pour tester la clé DeepSeek en direct — permet de qualifier en dix
  secondes une panne de production (nom d'environnement, collé de clé, solde).

### [FORCE MAJEURE] — `POST /api/support/chat` : même durcissement
- Même défaut de production (appel z-ai direct, sans repli) : migré vers
  `generateChatReply` (DeepSeek → z-ai → repli local déterministe recommandant
  les services du matching lexical déjà calculé) + `maxDuration = 30`.

### [CORRECTIF] — 404 /favicon.ico (console du navigateur)
- `src/app/favicon.ico` (conteneur ICO valide embarquant un PNG 32 px du logo)
  + `src/app/icon.png` (192 px, convention app router) générés via sharp à
  partir de `public/logo.svg` — le navigateur ne demande plus un favicon absent.

### [DONNÉES/DOC]
- `.env.example` : section « Chat IA » réécrite — nom EXACT de la variable,
  environnement **Production** (pas Preview) + Redeploy obligatoire, lecture
  des codes du ping, chaîne de repli v1.10.1 documentée.

> Procédure de qualification en production : GET `https://b2bpro.store/api/service-chat`
> (`keyPresent: false` → variable absente/mal nommée/mal scopée) puis
> `?ping=1` (`401` → clé invalide · `402` → solde DeepSeek insuffisant ·
> `200` → opérationnelle). Après correction Vercel, **Redeploy** est requis.

---

## [1.10.0] — 2026-11-11 — Chat IA flottant par service : l'assistant du vendeur (DeepSeek)

Mandat utilisateur : une fonctionnalité robuste de réponse par l'IA alimentée par l'API
DeepSeek, avec pour chaque service un bouton flottant de chat portant les initiales du
vendeur ; réponses conviviales, rassurantes, mettant en avant les gains exceptionnels
offerts par le service, tout en restant brèves (jamais bavardes).

### [ADDITIF] — Assistant IA de chaque fiche service
- **`src/lib/ai-provider.ts`** (nouveau) : couche fournisseur LLM unique — routage
  DeepSeek (`DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL`, endpoint compatible OpenAI, timeout
  30 s) avec **repli automatique sur la passerelle z-ai** (celle du support IA) : clé
  absente ou échec réseau = la conversation continue, jamais de panne visible.
- **`POST /api/service-chat`** (nouveau) : slug validé + fiche rechargée depuis la
  base (titre, prix, délais, note, inclus, livrables, options, FAQ, identité vendeur),
  historique assaini (14 messages max, 2 000 car.), anti-abus mémoire par IP
  (20 msg/min), prompt système incarnant l'assistant du vendeur — règles absolues :
  français impeccable, vouvoiement, **2 à 4 phrases / 90 mots max**, gain
  exceptionnel chiffré à chaque réponse, réassurance (séquestre, ajustements,
  remboursement), invitation finale douce, zéro invention de chiffre.
- **`ServiceChatWidget`** (nouveau) : bouton flottant en bas à droite de chaque fiche
  portant **les initiales du vendeur sur son dégradé d'avatar** (couleurs uniques par
  vendeur, repli emerald), pastille de discussion + halo pulsant ; panneau de
  conversation (rôle dialog, Échap pour refermer) : message d'accueil déterministe
  sans appel réseau, suggestions tirées de la FAQ de la fiche, indicateur de frappe,
  persistance par service (sessionStorage), message de repli rassurant en cas d'échec,
  mention de transparence IA + garanties sous le champ de saisie.
- **`page.tsx` des services** : calcul serveur des initiales/couleurs/suggestions et
  rendu du widget (aucune donnée client inversée — tout vient de la fiche rendue).
- **`.env.example`** : section « Chat IA par service » (DEEPSEEK_API_KEY, DEEPSEEK_MODEL).
- Hygiène : suppression du doublon `skills/redaction-seo-geo-aio/SKILL.md` (déplacé
  vers `docs/SKILL-REDACTION-SEO-GEO-AIO.md` au commit v1.9.0 — le dépôt suit).

---

## [1.9.0] — 2026-11-11 — Tour d'élites SEO/GEO/AIO : scrutage intégral + skill verrouillé machine

Mandat utilisateur : scruter chaque service et article (critères SEO + GEO + AIO),
vérifier que les mots-clés à fort trafic sont véritablement sourcés et ajoutés, que la
longueur minimale est respectée, et rendre le skill assez robuste pour que les PROCHAINS
services/articles soient parfaitement optimaux pour le référencement et les réponses d'IA.

### Méthode — 4 experts en parallèle (T2-b à T2-e) + scanner élite
- **Scanner dédié** : `scripts/audit-seo-geo-aio.ts` (`bun run audit:seo`, nouveau) —
  1 799 contrôles sur 113 fiches + 12 articles : titre ↔ primaire (ancrage), structure
  mots-clés (3-5 mots), unicité (anti-cannibalisation), answer-first, 1ère question FAQ
  « comment… », faits chiffrés liftables, densité, hygiène typographique, maillage interne
  blog, llms.txt/llms-full.txt/sitemap/robots. Rapport versionné
  `docs/audits/audit-seo-geo-aio-2026-11-11.md`.
- **E1 (fiches)** : 113/113 primaires de 6-10 mots (le contrat exige 3-5 : personne ne
  tape ces phrases verbales), 3 fiches à primaire hors titre (ponctuation), ~15 défauts
  de langue systémiques (« Confiez analyser… », « de analyser », sigles en minuscules).
- **E2 (blog)** : 12/12 titres hors standard (82-114 car. pour ≤ 75), 1 nombre figé
  (« Plus de 100 services »), 3 extraits sans chiffre citable.
- **E3 (mots-clés)** : sourçage prouvé au niveau des pôles (113/113 fiches portent 2-5
  hotKeywords sourcés, 0 cannibalisation), MAIS le slot primaire — le plus pondéré du
  SEO — n'était jamais sourcé ; bug de dédoublonnage LT reproduit sur la fiche #101.
- **E4 (skill)** : clauses non verrouillées (primaire 3-5 mots, FAQ « comment », unicité,
  titre blog ≤ 75, liens internes) ; **causes racines générateur** : `cleanPrimary()`
  bornait en caractères (pas en mots), pool FAQ sans variante « comment », `add-service`
  divergent du seed, littéral « 112 services » codé en dur.

### [DONNÉES] — Migration élite (`scripts/migrate-elite-seo.ts`, idempotente)
- **113 primaires commerciaux curés** (`data/gen/elite-keywords.ts`, audit E1) : tête de
  3-5 mots, sous-chaîne contiguë du titre, requête plausible d'acheteur, unique entre
  fiches ; l'ancienne phrase verbale basculée en tête de longue traîne (dédoublonnage
  normatif — bug #101 corrigé au passage).
- **113 FAQ réordonnées** : la question « comment… » (activateur GEO v1.7.0 n°4) passe
  en tête — c'est le format le plus repris par les assistants IA.
- **21 fiches corrigées langue** : élisions (« de analyser » → « d'analyser »,
  « prestation de intelligence » → « d'intelligence »), sigles/marques (EHPAD, BTP,
  Glassdoor, Uber Eats, CPF, RNA), 12 nominalisations curées (« Confiez analyser… » →
  « Confiez l'analyse de… »).
- **12 titres d'articles raccourcis ≤ 75 car.** (66-73, mot-clé en tête, anglicismes et
  promesses non tenables purgés) + 3 extraits renforcés d'un chiffre citable (+115 %
  Princeton, 215 Md€, 89 %) + mention figée reformulée en ouvert (« Un catalogue qui
  s'enrichit chaque semaine… ») — sources `data/blog/*.md` → `bun run scripts/sync-blog.ts`.

### [FORCE MAJEURE] (protocole §5) — Générateur et portes existantes
**Justification** : aucune approche purement additive ne pouvait garantir les clauses
contractuelles existantes (activateur n°4 « la FAQ commence par comment… » et primaire
3-5 mots) — les défauts étaient reproductibles par le seed lui-même.
- `humanizeFaq()` : la question « comment… » générée en TÊTE (réordonnancement, pools
  et réponses inchangés).
- `buildKeywordsV2()` : primaire borné en MOTS via `clampPrimaryToSkill()` (3-5 mots
  significatifs, repli catégorie) — `cleanPrimary()` reste utilisé pour les citations.
- `guard` 8bis/8ter durcis : borne basse title 40 (alignement sur audit:content),
  littéral « 112 services » → regex `\d{2,3} services` (périmètre réel).

### [ADDITIF] — Verrouillage machine (le skill devient auto-exécutant)
- **Guard : 15 → 19 contrôles** (extensions additives, ids stables) :
  `services-primary-wordcount` (3-5 mots + ancré dans le titre), `services-primary-unique`
  (anti-cannibalisation), `services-faq-first-comment` (1ère question « comment… »),
  `blog-seo-standards` (titre ≤ 75, ≥ 3 liens /services/, zéro cadratin).
- **audit:content étendu** : 1 291 → 1 666 contrôles (primaire mots/titre, FAQ
  « comment », blog titre/liens/cadratins, nombre figé généralisé).
- **Pipeline futur scellé** : `add-service` bascule sur le funnel unique
  `buildHumanizedBundle` (fin de la divergence E4-B3) ; `add-blog` (nouveau) crée un
  article AVEC porte de qualité pré-insertion ; `sync-blog` refuse tout article non
  conforme AVANT écriture ; `buildHumanizedBundle` applique les primaires curés
  (parité seed ↔ base migrée, source unique `elite-keywords.ts`).
- **Preuves de sourçage** : `data/keyword-sources.json` (registre : pools par pôle,
  2 volumes documentés, sourçage manuel #101, primaires curés, veille GSC planifiée).
- **Skill d'environnement créé** : `skills/redaction-seo-geo-aio/SKILL.md` (le miroir
  référencé par le contrat n'existait pas — E4).
- Contrat `docs/SKILL-REDACTION-SEO-GEO-AIO.md` v1.9.0 (tableau quantitatif étendu,
  ÉTAPE 6 avec `audit:seo`) ; `docs/REGRESSION-GUARD.md` synchronisé (19 contrôles).
- `not-found.tsx` : dernier cadratin UI du payload supprimé (« vérifiés, ou demandez… »).

### Validation machine (protocole complet)
- `bun run audit:seo` : **0 échec / 1 799 contrôles** ✓ · `bun run audit:content` :
  **1 666/1 666** ✓ · `bun run guard` : **19/19** ✓ · `audit:ai-traces` : ✓ aucune
  signature transverse · `bun run lint` : 0 erreur.
- Navigateur (agent-browser) : accueil 200 sans erreur, fiche phare (FAQ « Comment
  analyser 100 annonces auto… » en tête + answer-first « comptez 25 € »), article
  llms.txt (nouveau titre 68 car., reformulation ouverte, 0 cadratin), 0 erreur console.
- Migration Neon : 11/11 tables identiques (113 services, 33 vendeurs, 205 options,
  1 319 avis, 12 articles, 44 entrées IA, 4 réglages, 9 audits).

### Suivi (E3, documenté dans data/keyword-sources.json)
- Ligne de base GSC (impressions/positions par primaire) dès les premières données ;
  volumes des 140 hotKeywords à documenter en priorité ; réévaluation trimestrielle
  des primaires MOYENNES ; filtrage sémantique des hotKeywords plaqués hors-sujet
  (247 placements constatés) en prochaine itération.

---

## [1.8.1] — 2026-11-10 — Échec de déploiement v1.8.0 « Integration provisioning » : diagnostic + procédure (docs)

Mandat : trois déploiements production consécutifs en échec (3caf1b5 · 3a14d8a · e244dc2),
chacun avec « Integration provisioning error — Resource provisioning timed out ».

### Diagnostic (rien à corriger côté dépôt)
- L'échec survient **avant** « Installing/Building » : Vercel provisionne les ressources des
  intégrations attachées au projet (Storage / marketplace) et l'une d'elles expire — ni le
  code, ni GitHub, ni le contenu v1.8.0 ne sont en cause (e244dc2 est un commit vide de
  changement, même échec). Suspect le plus probable : intégration **Neon** connectée au
  projet pendant la phase de migration v1.8.0 — superflue car `DATABASE_URL` (§3 du runbook)
  pointe déjà manuellement sur la base réelle.
- Production **inchangée** : apex 200 · www 308 · llms.txt 200 · sitemap 200 · fichier GSC
  200 — le dernier déploiement vert (v1.7.0) sert toujours le site, les soumissions GSC ne
  sont pas affectées.
- Base **Neon vérifiée en lecture seule** : 113 services · 33 vendeurs · 1 319 avis ·
  12 articles, 0 cadratin résiduel dans les 12 articles — le contenu humanisé v1.8.0 est
  migré et prêt, aucune action de données requise.
- Code **sain** : `bun run lint` 0 erreur ; aucune nouvelle erreur de typage introduite par
  v1.8.0 (erreurs `tsc` résiduelles toutes pré-existantes dans des fichiers non-contraints,
  build tolérant déjà en place — `typescript.ignoreBuildErrors` — pour les déploiements verts
  v1.5 → v1.7).

### [ADDITIF] Runbook §9 — ligne « Déploiement échoue avant le build »
- Procédure en 4 pas (test Redeploy → retrait de l'intégration superflue depuis
  *Storage*/*Integrations* → vérification `DATABASE_URL`/`BLOB_READ_WRITE_TOKEN` →
  Redeploy final), garde-fous : conserver le store Blob (miniatures), ne rien supprimer
  dans la console Neon, ne pas toucher aux domaines.
- Commit préparé **sans poussée immédiate** (ne pas déclencher un 4e échec avant le retrait
  de l'intégration) ; poussé après confirmation du déploiement vert.

---

## [1.8.0] — 2026-11-10 — Tour d'experts anti-traces d'IA : la voix remise au propre

Mandat utilisateur : déployer tous les experts pour vérifier profondément que chaque service
et chaque article de blog ne porte aucune trace d'écriture automatique ; effectuer les
vérifications et corriger, sans revendiquer d'état absolu.

### Méthode — 6 agents d'audit (T2-a à T2-f) puis correctifs vagues T3
- **Scanner dédié** : `scripts/audit-ai-traces.ts` (nouveau) — cinq familles de signatures
  (duplication transverse de phrases/H2/FAQ/puces/process, typographie mécanique [cadratins,
  décimales à point, pourcentages collés, guillemets droits], lexique téléguidé, rythme
  uniforme, répétitions inter-articles), rapport versionné `docs/audits/`, code sortie non
  nul en cas de signature. Audit initial : **58 familles de répétitions transverses**
  (phrases partagées jusqu'à 113×, H2 jusqu'à 27×, FAQ jusqu'à 45×), 173 cadratins dans les
  12 articles, 15 bios vendeurs fautives, ~230 défauts éditoriaux cités par les experts.
- **Experts 1-4 (fiches)** : ~240 défauts confirmés avec corrections prêtes (expertises
  hors-sujet [mots-clés d'autres fiches injectés], livrables génériques contradictoires
  [« Tableau Excel » promis par un service Markdown], chiffres contradictoires titre ↔
  description [100/50, 20/15, 30/25, 5/4], « Réponse du vendeur en moins de 2 h » contredisant
  le badge vendeur, casses de marques, élisions manquantes).
- **Expert 5 (blog)** : 173 cadratins localisés ligne par ligne, balanciers binaires, triades
  systématiques, intervalles anglo-saxons (« 25-50 € »), ouvertures/conclusions clones.
- **Expert 6 (rendu)** : buildAnswerFirst à double verbe (« livre formater votre catalogue »)
  sur les 113 fiches + 113 lignes llms-full.txt, « dès 25 € » contredit par 4 services à 20 €,
  notes vendeurs confondues avec les notes services, décimales à point, « 7j/7 » collé.

### [FORCE MAJEURE] (protocole §5) — Couche rédactionnelle humanize.ts v2
**Justification** : les six experts ont confirmé que les coutures de gabarits (phrases
identiques sur des dizaines de fiches) et les faux savoir-faire (mots-clés du pôle injectés
comme « expertises ») sont visibles à la lecture de deux onglets ; irrecevable pour un
contenu qui doit lire comme une fiche rédigée à la main. Le fond métier de chaque fiche
(intro, cœur, closing business) reste conservé à l'identique ; seule la voix est reconstruite.
- **Expertise fondée sur le vendeur réel** : les phrases « Deux domaines structurent… »
  s'appuient désormais sur `seller.skills` (les VRAIES compétences du vendeur), plus jamais
  sur les mots-clés d'autres fiches du pôle.
- **Chaque bloc partagé porte un paramètre propre au service** (prix, délai, note, avis,
  ventes, réactivité vendeur, pays, pôle, catégorie [107 valeurs], mot-clé primaire) :
  20 accroches, 15 combinaisons de garanties, 14+14+14+14 titres H2, 14 blocs garanties/géo,
  9 puces par garantie, 12+8+10+8 gabarits de process (dont le temps de réponse RÉEL du
  vendeur en étape 1), 9+8 livrables (livrable principal reformulé par pôle : plus aucun
  « Tableau Excel » sur un service Markdown), questions de FAQ paramétriques (0 question
  partagée), hash à avalanche pour éliminer les grappes de sélection.
- **Idempotence réparée** : `decompose()` reconnaît désormais le format humanisé v1/v2
  (une ré-exécution ne peut plus incruster d'anciennes sections — défaut constaté et corrigé
  pendant la validation).

### [CORRECTIF] — Pré-passes de contenu (base + catalogue source)
- 17 titres agrammaticaux corrigés (décimales, déterminants, possessifs, sigles plaqués),
  resserrés au plafond SGA™ de 75 caractères ; 9 incohérences de chiffres titre ↔ description
  alignées ; typographie normalisée (espaces avant %, décimales à la virgule, casses de
  marques : Buy Box, Uber Eats, Qualiopi, EHPAD, NAF, SIREN, CPV, Glassdoor…) ;
  « Churhn » → churn, « 10k » → « 10 000 », « Réel » → Reel, élisions manquantes.

### [DONNÉES] — Blog, vendeurs, avis, base de connaissances
- **12 articles** : 173 cadratins typographiés (incises → parenthèses, appositions →
  deux-points/virgules, « Étape N — » → « Étape N : »), balanciers binaires reformulés,
  intervalles francisés (« 25 à 50 € », « ×4 »), cohérence chiffrée réparée (horaires BOAMP,
  fourchettes prospection), ouvertures/conclusions diversifiées SANS toucher au pattern
  answer-first GEO. Sources `data/blog/*.md` + `scripts/sync-blog.ts` (nouveau) pour
  resynchroniser la base servie.
- **33 vendeurs** : 15 bios + 3 titres dé-cadratinés, « je audite » → « j'audite »,
  « command publique » → « commande publique », « content de survoler » → « se contentent
  de survoler » (sources `data/gen/sellers.ts` + patch base `scripts/patch-sellers.ts`).
- **1 319 avis** : pool v2 re-genré-équilibré — 14 accords de genre neutralisés
  (« satisfait » attribué aussi à des auteures), doublons quasi identiques séparés,
  re-distribution déterministe (1 108 textes uniques, répétition max 3×, notes inchangées).
- **Support IA** : 1 réponse d'accueil réalignée (« dès 20 € »).

### [CORRECTIF] — Chaînes rendues (code uniquement)
- `buildAnswerFirst` (src/lib/site.ts) : le double verbe « livre formater votre catalogue… »
  (« livre » + infinitif) remplacé par « Pour {mot-clé}, comptez {prix} et une livraison en
  {délai}… » — grammatical pour tout primaire ; « paiement sécurisé » → « séquestré »
  (terme maison) ; jours ouvrés pluralisés. Cette formule alimente le bloc « Réponse
  rapide » des 113 fiches ET les 113 lignes « RÉPONSE DIRECTE » de llms-full.txt.
- **Harmonisation « dès 20 € »** (plancher réel de la base, 4 services à 20 €) sur : accueil,
  catalogue, catégories, blog, support IA, contrats, base de connaissances, llms.txt,
  llms-full.txt, placeholder admin.
- **llms.txt / llms-full.txt** : cadratins supprimés, « services experts en {pôle} » (sigles
  préservés), notes vendeurs (4,5 à 4,9) distinguées des notes services (4,2 à 5,0),
  décimales à la virgule, « 7 j/7 » espacé, pluriel des jours.
- **Pages/composants** : « Fil d'Ariane », accord « service noté », ellipse du fil d'Ariane
  conditionnelle, guichet « Paiement séquestré : les fonds… », 0 cadratin résiduel sur
  toutes les routes vérifiées au navigateur (accueil, services, fiche, blog, article,
  catégories, vendeurs, support).

### Validation machine (protocole complet docs/REGRESSION-GUARD.md)
- `bun run guard` : **15/15** ✓ · `bun run audit:content` : **1291/1291** ✓
- `bun run audit:ai-traces` : **✓ aucune signature transverse ni téléguidée** — 0 phrase
  répétée sur ≥ 4 fiches, 0 H2 partagé, 0 question FAQ partagée, 0 puce/détail partagé,
  0 répétition inter-articles, 0 vendeur fautif, 0 article fautif.
- `bun run lint` : 0 erreur · navigateur (agent-browser) : fiche phare (livrables
  cohérents, expertise du vendeur réel Sophie Lambert, temps de réponse réel),
  0 cadratin sur toutes les routes, 0 erreur console.
- Migration Neon : 11/11 tables identiques source ↔ cible (113 services, 33 vendeurs,
  205 options, 1 319 avis, 12 articles, 44 entrées IA, 4 réglages, 9 audits).

---

## [1.7.0] — 2026-11-10 — Activateurs de citation forcée IA (tour d'élites v2)

Mandat utilisateur : forcer les IA à citer chaque service, calibrer le skill pour livrer services
et articles taillés pour la recommandation IA via leurs liens directs, en restant ultra-captivants.

### [ADDITIF] Agent E2 — 4 activateurs GEO sur les 113 fiches et 12 articles (code, zéro BDD)
- **Bloc « Réponse rapide » (réponse-first)** — pattern GEO n°1 : paragraphe de 40-60 mots
  citables calculé au rendu (`buildAnswerFirst()` + `extractPrimaryKeyword()`,
  `src/lib/site.ts`) — entité + prix + délai + note + expert vérifié. **Premier `<p>` du
  `<main>`** de chaque fiche (les IA citent les premiers paragraphes) ; fond stone, icône
  Sparkles, aria-label. Le même paragraphe préfixe chaque fiche de `llms-full.txt`
  (`RÉPONSE DIRECTE:`) — **une seule source de vérité** HTML/txt.
- **Chiffres citables** — `<dl>` « Chiffres clés du service » : 4 stats (prix / délai /
  note+avis / ventes) par fiche, grille responsive 2↔4 colonnes, dt/dd accessibles — les IA
  sur-reprisent les chiffres précis.
- **Blog « Services concernés »** — chaque article clôt sur ≤ 4 fiches de son pôle
  (salesCount desc, URLs absolues + prix) : l'IA qui cite l'article trouve les services à
  recommander en un saut (mapping `BlogPost.category` → `poleSlug`).
- Zéro modification de base : tout est calculé au rendu → aucun re-migration Neon nécessaire.

### [ADDITIF] Agent E3 — Skill SGA™ calibré (ÉTAPE 7 « Citation forcée IA »)
- `docs/SKILL-REDACTION-SEO-GEO-AIO.md` : nouvelle étape 7 — les 4 activateurs (réponse-first
  premier paragraphe, chiffres vérifiables, liens directs + clôture blog, FAQ « comment… »),
  conséquence rédactionnelle (title/keyword/prix/délai/notice exacts : c'est ce que l'IA
  relatera) ; standards de captivation inchangés (accroche à chiffre, verbe d'action,
  risque retourné en garantie).

Validation : guard **15/15** · lint **0** · navigateur fiche phare (bloc réponse premier
paragraphe + stats 35 €/3 jours/4,8/5/9 avis) · blog SEO-GEO-AIO (4 services liés avec
prix) · llms-full.txt 113/113 avec `RÉPONSE DIRECTE` · vérification production live
post-push (ci-dessous).

---

## [1.6.5] — 2026-11-10 — Inversion appliquée par l'opérateur : URLs www neutralisées dans le code

État atteint (vérifié live) : l'opérateur a inversé la redirection dans Vercel —
`https://b2bpro.store` sert le site en **200 direct**, `www ↪ 308 apex`. Contrôle complet :
intégrité 200/ok, sitemap 176 URLs, fichier GSC 200, llms.txt 200, robots IA.

### [FORCE MAJEURE §5] `getSiteUrl()` neutralise le préfixe www
- **Constat** : `NEXT_PUBLIC_SITE_URL` avait été définie sur Vercel avec
  `https://www.b2bpro.store` (pendant la période où www servait le site) → tout
  l'échafaudage SEO émettait des URLs www (sitemap 176 URLs, llms.txt 177, canonicals +
  JSON-LD par fiche) alors que www redirige désormais vers l'apex — signaux contradictoires,
  et sitemap refusé par la propriété GSC apex (« URLs hors propriété »).
- **Correctif** (`src/lib/env.ts`) : toute valeur (`NEXT_PUBLIC_SITE_URL` ou `SITE_URL`)
  voit son préfixe `www.` retiré (`https://www.b2bpro.store` → `https://b2bpro.store`) —
  le canonique de b2bpro.store est l'apex, par architecture (GSC, sitemap, canonicals,
  JSON-LD, llms.txt). Tests unitaires : www → apex, www+slash → apex, défaut → apex.
- **Bénéfice** : plus aucune action requise sur la variable Vercel (mise à jour de la
  valeur ou suppression demeurent conseillées pour l'exactitude, cf. runbook §9).

### [ADDITIF] Runbook : coexistence des propriétés GSC + FAQ
- §6 : encadré « Plusieurs propriétés GSC (www + apex) — pas de double emploi » —
  propriétés indépendantes (silos) ; travailler sur l'apex ; www = observatoire de
  transition ; « Traitement des données en cours » ~24 h = normal.
- §0/§3 : la valeur conseillée de `NEXT_PUBLIC_SITE_URL` précise « sans les www,
  neutralisée par le code ».
- §9 FAQ : +2 lignes (URLs www dans sitemap/canonicals ; double emploi de propriétés).

Validation : unitaire www→apex ✅ · lint 0 · déploiement vérifié live post-push
(sitemap/canonicals/llms.txt/JSON-LD tous passés à l'apex).

---

## [1.6.4] — 2026-11-10 — Ordre d'inversion corrigé : la cible de redirection n'accepte pas un domaine redirigé

Retour opérateur (capture d'écran) : dans l'Edit de `www.b2bpro.store`, la cible
`b2bpro.store` **n'apparaît pas** dans la liste des redirections (seul
`b2bpro-store.vercel.app` est proposé). Cause : **Vercel interdit de rediriger vers un
domaine qui est lui-même une redirection** — tant que l'apex est en ↪ 308 www, il est
exclu de la liste des cibles. La procédure v1.6.3 supposait qu'on pouvait directement
choisir l'apex depuis l'Edit de www : ordre incorrect.

### [CORRECTIF] Procédure d'inversion réordonnée (runbook §2.3 + §9)
1. **d'abord** l'apex `b2bpro.store` (ligne ↪ 308) → Edit → radio **« Connect to an
   environment »** → **Production** → Save (état intermédiaire : apex ET www servent
   tous deux le site — normal) ;
2. **puis** `www.b2bpro.store` → Edit → **« Redirect to Another Domain »** →
   `b2bpro.store` **apparaît alors dans la liste** → code **308 Permanent Redirect** →
   Save ;
3. rappel : ne jamais *Remove* les lignes de domaine (DNS inchangé, reste Valid).
- §9 FAQ : nouvelle ligne « la cible `b2bpro.store` n'apparaît pas dans la liste des
  redirections » + ligne GSC enrichie de l'ordre imposé.

Validation : diagnostic confirmé par la capture (liste limitée à
`b2bpro-store.vercel.app` tant que l'apex redirige) · lint 0.

---

## [1.6.3] — 2026-11-10 — Domaine branché : sens de redirection inversé détecté et documenté

Constat opérateur : domaine connecté la veille (Vercel affiche les 3 domaines en **Valid
Configuration**) mais GSC « se comporte comme si rien n'était connecté ». Diagnostic live :
`https://b2bpro.store/*` renvoie **308 → `https://www.b2bpro.store/*`** — le sens de
redirection est **inversé** (www = cible Production, apex redirigé), alors que tout
l'échafaudage SEO (canonicals, sitemap, llms.txt, JSON-LD, propriété GSC) est **apex**.

### [CORRECTIF] Documentation du piège « apex ↪ 308 www »
- Runbook §2.3 : nouvelle étape 5 « vérifier le sens de la redirection » + encadré dédié —
  Google ne suit pas les redirections pour la vérification GSC par fichier HTML : un apex
  qui redirige fait échouer la vérification malgré un domaine « Valid Configuration ».
  Procédure d'inversion (www → *Redirect To* apex ; vider le *Redirect To* de l'apex,
  DNS inchangé) + contrôle `curl -I …/google…html` → **200 direct**.
- Runbook §9 FAQ : ligne « Valid Configuration mais GSC comme si rien n'était connecté ».
- Runbook §2.3 : l'IP A de l'apex documentée comme « celle affichée par Vercel »
  (76.76.21.21 ou 216.198.79.1 — la configuration réelle utilise 216.198.79.1, valide).
- `scripts/gen-gsc-urls.ts` + `docs/GSC-SOUMISSION-SERVICES.md` régénéré (223 lignes) :
  le prérequis « 200 direct sur l'apex, sans redirection » est explicite en §1.

Note : l'inversion se fait dans l'UI Vercel par l'opérateur (aucun changement de code ni de
DNS requis — les deux enregistrements restent Valid).

Validation : diagnostic live curl (308 apex→www confirmé, www sert le site en 200,
fichier GSC 200 sur www) · lint 0.

---

## [1.6.2] — 2026-11-10 — Vérification GSC par fichier HTML + soumission individuelle des 113 fiches

Mandat utilisateur : concentrer le effort sur la soumission robuste et correcte du site à
Google Search Console, en s'assurant que **chaque service est soumis individuellement sur sa
propre page**. Le fichier de vérification GSC téléchargé par l'opérateur
(`googlec5dc6c64480779bb.html`) est déployé et la chaîne complète de soumission est documentée.

### [ADDITIF] Fichier de vérification GSC servi en production
- **`public/googlec5dc6c64480779bb.html`** (53 octets, contenu exact Google) : servi à la
  racine de **chaque déploiement** — `https://b2bpro.store/google…html` (une fois le domaine
  branché) **et** `https://b2bpro-store.vercel.app/google…html` (dès maintenant). HTTP 200,
  `text/html`, `robots.txt` sans `Disallow` → librement récupérable par Google.
- Constat vérifié en local : GET `/googlec5dc6c64480779bb.html` → 200 + contenu exact.

### [ADDITIF] Chaque service, individuellement soumis — preuves et outillage
- **Sitemap** : 176 URLs dont **113 fiches service individuelles** (`/services/<slug>`,
  priorité 0.9, `lastmod` = `createdAt` réel) — vérifié en live sur `/sitemap.xml`.
- **Indexabilité par fiche** (vérifiée sur la fiche phare) : `robots: index, follow`,
  canonical absolue, title et meta description uniques.
- **`scripts/gen-gsc-urls.ts` + `docs/GSC-SOUMISSION-SERVICES.md`** (213 lignes) : la liste
  exhaustive des **113 URLs directes** classées par ventes décroissantes et par pôle, prête à
  coller dans l'**Inspection d'URL GSC** (soumission individuelle, « Demander l'indexation »,
  ~10-12/jour) — régénérable via `bun run gen:gsc-urls` (alias package.json ajouté).

### [ADDITIF] Runbook §6 réécrit (runbook de vérification GSC)
- Méthode **« Fichier HTML » documentée en premier** (celle choisie par l'opérateur) : le
  fichier est déjà déployé, il reste à cliquer « Vérifier » — prérequis : domaine branché
  (§2.3) ; le même fichier couvre la propriété `b2bpro-store.vercel.app` en attendant.
- Nouvelles étapes : soumission du sitemap (176 URLs / 113 fiches individuelles) et
  **soumission individuelle des fiches** via Inspection d'URL avec référence au document.
- §7 checklist : ligne 9 réécrite pour le fichier HTML + ligne 9b (méthode META) ;
  §9 FAQ : ligne « fichier HTML introuvable / vérification échouée » (NXDOMAIN, propagation).

Validation : GET fichier 200 (text/html, contenu exact) · sitemap 176 URLs/113 services
· fiche phare `index, follow` + canonical + title/description uniques · lint 0.

---

## [1.6.1] — 2026-11-10 — Runbook aligné sur l'interface Vercel 2025 + routes parasites purgées

Suite au blocage de l'opérateur sur la console Vercel (capture d'écran à l'appui) : le runbook
renvoyait vers une navigation qui n'existe plus, et une variable créée en type Secret déclenchait
l'alerte « Keep This Value Private » sans explication.

### [CORRECTIF] Runbook vs interface Vercel réelle (docs/DEPLOIEMENT-VERCEL.md)
- **§2.3 Domaine réécrit** pour l'interface 2025 : **Domains** est une entrée **directe de la
  barre latérale du projet** (juste sous *Environment Variables*) — l'ancien chemin
  « Settings → Domains » n'existe plus. Procédure complète : ajout de `b2bpro.store` puis
  `www.b2bpro.store` en **redirect to apex** (l'apex reste la cible finale), DNS registrar
  `A @ 76.76.21.21` + `CNAME www → cname.vercel-dns.com`, attente **Valid Configuration**.
- **§3 Alerte « Keep This Value Private » documentée** : `NEXT_PUBLIC_*` en type **Secret**
  déclenche l'avertissement Vercel (bordure rouge + infobulle) — ce n'est pas un échec. Trois
  issues valides : **Change to Config** (recommandé pour une URL publique), renommage en
  `SITE_URL` (sans préfixe, lu par `getSiteUrl()`), ou pas de variable du tout.
- **§3 + §0 exactitude** : seule `DATABASE_URL` est indispensable au premier lancement ;
  `NEXT_PUBLIC_SITE_URL` est **optionnelle** (défaut `https://b2bpro.store` codé dans
  `src/lib/env.ts`) — correction de l'affirmation antérieure « indispensable ».
- **§9 FAQ +2 lignes** : « Settings → Domains introuvable » et « alerte rouge NEXT_PUBLIC_* ».

### [CORRECTIF] Routes parasites locales purgées (dev seulement, production intacte)
- Copies non suivies antérieures à la restructuration `(public)/` (`src/app/page.tsx`,
  `blog/`, `categories/`, `services/`, `support/`, `vendeurs/` au premier niveau) provoquaient
  « You cannot have two parallel pages that resolve to the same path » → **500 sur `/`** en dev
  local. Supprimées (jamais committées : **la production Vercel n'a jamais été affectée**).
- Normalisation des modes de fichiers (bruit chmod 755 → 644, 48 fichiers, 0 ligne modifiée).

Validation : `GET /` **200** local · rendu navigateur complet (annonce, hero, stats 113/33) ·
`git status` propre (hors captures d'écran utilisateur).

---

## [1.6.0] — 2026-11-10 — Triple conquête : citabilité IA maximale, humanisation intégrale, mots-clés réels

Mandat utilisateur : trois chantiers menés par des agents dédiés — (1) vérifier et corriger tout
ce qui pourrait empêcher chaque service d'être cité par les IA, avec les liens directs de chaque
service ; (2) vérifier et supprimer toutes les traces d'IA et humaniser à 100 % chaque service ;
(3) vérifier que les mots-clés à fort trafic web ont été sourcés et intégrés à chaque service.

### Méthode — 3 agents d'audit puis 3 agents de correction
- **Audit 1-a (citabilité GEO/AIO)** : 13 zones contrôlées (protocoles IA, JSON-LD, sitemap,
  llms.txt, answer-first, FAQ, maillage, production). Verdict : socle solide (robots IA 14
  crawlers, llms.txt 113/113 avec URLs absolues, 5 types JSON-LD valides) freiné par 8 écarts
  majeurs (titles tronqués, lastmod absent, llms-full.txt inexistant, URL invisible…).
- **Audit 2-a (traces d'IA)** : contamination structurelle 113/113 — 4 H2 identiques sur tout le
  catalogue, accroche squelette avec mot-clé agrammatical en gras, phrase « s'appuie sur : » avec
  fautes d'élision publiques (« de intelligence »), 234 em-dash, 493 puces « ✓ », blocs mot pour
  mot répétés 113×, 1 319 avis recyclés depuis 31 textes.
- **Audit 3-a (mots-clés)** : 99 % artificiels — regex de génération cassant les mots
  (« goog », « annon », « t »), 848/2 256 mots-clés agrammaticaux, 98 requêtes réelles dormantes
  dans poles.ts, 0 aiQuery publiée, couverture title/H2/shortDesc/FAQ ≤ 2,7 %.

### [ADDITIF] Agent 4 — citabilité IA des fiches (code uniquement)
- **`llms-full.txt`** (nouvelle route) : les 113 fiches en version étendue — URL absolue, prix,
  délai, note, mots-clés, description complète et 5 FAQ par service (552 Ko de matière première
  de citation longue pour GPTBot/PerplexityBot/ClaudeBot).
- **llms.txt** : section « Vendeurs vérifiés (33) » avec liens + référence de la version étendue
  (175 entrées `- [` linkées au total).
- **Métadonnées fiches réparées** : title jamais tronqué (« dès N € » et suffixe intouchables,
  coupe au dernier mot complet, strip des mots vides traînants) ; meta description coupée à la
  dernière phrase complète (plus jamais mi-mot). Ces deux extraits sont les plus repris par les IA.
- **JSON-LD enrichi** : nœud Service complété (`url`, `image`, `sameAs`), `offers.url` sur le
  Product ; **ItemList** ajouté au catalogue (113 positions, URLs absolues).
- **Sitemap** : `lastmod` généralisé (12 → 176 URLs — fraîcheur signalée aux crawlers IA).
- **robots.txt** : +4 crawlers IA (DuckAssistBot, YouBot, MistralAI-User, meta-externalagent → 18).
- **URL absolue visible** dans le bloc answer-first de chaque fiche (« Page officielle : … »).
- **Maillage cross-pôle** : 4ᵉ service lié = best-seller d'un autre pôle (deterministe).

### [FORCE MAJEURE] (protocole §5) Agents 5+6 — humanisation intégrale du contenu
**Justification** : les descriptions/FAQ/avis étaient des squelettes à variables assemblés
automatiquement (preuves quantifiées en audit 2-a/3-a : fautes d'élision publiques, mots-clés
cassés affichés en gras sur les 113 fiches) — irrécupérables par retouche, la couche rédactionnelle
est reconstruite. Le fond métier spécifique de chaque fiche (blocs « Ce que vous recevez ») est
conservé à l'identique ; seul l'habillage est réécrit.
- **`data/gen/humanize.ts`** (nouveau, 1 100 lignes) : couche rédactionnelle v2 — pools de
  variantes rédigées (8 accroches answer-first, 6 titres H2 × 4 slots, 5 phrases d'expertise,
  5 blocs garanties/géo, 3×5 FAQ, 4×4 titres de process, shortDesc), mots-clés V2
  (`buildKeywordsV2` : primary grammatical sans troncature + requêtes réelles à fort trafic),
  élisions françaises systématiques (`dePre`/`elideDe`), déterminisme total par hash de slug.
- **`scripts/humanize-content.ts`** (nouveau) : migration in-place idempotente des 113 fiches
  (champs touchés : description, shortDesc, keywords, faq, features, deliverables, process —
  jamais slug/prix/délais/notes/comptes). Résultats mesurés :
  « s'appuie sur : » 113→0 · em-dash 234→0 · puces « ✓ » 493→0 · shortDesc tronquées 39→0 ·
  guillemets anglais 19→0 · primary dans shortDesc 0→113 · titres H2 distincts 4→79 ·
  mots-clés « pôle collé » 100→0 · fautes d'élision 0 (garanti par construction).
- **Mots-clés V2 par fiche** : primary = syntagme complet grammatical ; secondary = catégorie +
  2-4 requêtes réelles (tableau audit SEO par pôle : « calcul rentabilité locative » ~2 900/mois,
  « BOAMP » ~6 000/mois, « créer un chatbot IA », « gagner la Buy Box Amazon »… + réactivation des
  hotKeywords[3..9] dormants de poles.ts) ; longTail grammaticaux ; aiQueries corrigées avec
  élisions. La question « comment {titre} » est désormais **publiée en FAQ visible** (Q4) —
  113/113 fiches (0 avant).
- **`scripts/humanize-reviews.ts`** (nouveau) + **`data/gen/reviews.ts`** (pool étendu 124 textes
  rédigés par niveau de note, contextualisation orderLabel/délai) : 1 319 avis redistribués —
  textes uniques 31 → **1 108**, répétition max 68× → 3×, notes et comptes strictement inchangés.
- **Reproductibilité** : `data/seed.ts` applique désormais la couche humanize après les builders
  legacy (mêmes générateurs partagés) — un seed neuf produit exactement le format de la base
  migrée. `generateReviews` consomme le pool v2 (signature inchangée).

### [DONNÉES] Base locale + production Neon
- Migration intégrale refresh (11/11 tables identiques, exit 0) — le contenu humanisé est servi
  en production. Snapshots avant (04:47) / après (05:46) pris et committés.

### Validation machine (protocole complet docs/REGRESSION-GUARD.md)
- `bun run guard` : **15/15** ✓ (services-content-standards sur les 113 fiches humanisées,
  reviews-invariants sur les 1 319 avis, équité de rotation intacte).
- `bun run audit:content` : **1291/1291 contrôles verts** (standard SGA™ intégral).
- `bun run lint` : 0 erreur · type-check : 0 erreur sur les fichiers touchés.
- **Navigateur (agent-browser)** : fiche témoin — accroche « Besoin d'analyser… » (élision
  correcte), H2 « À quoi sert d'analyser… », title non tronqué avec « € », JSON-LD exposant la
  nouvelle accroche, avis contextualisés ; accueil sain ; zéro erreur console.
- Production vérifiée après migration : contenu humanisé servi sur b2bpro-store.vercel.app.

---

## [1.5.1] — 2026-11-09 — Base de production Neon alimentée + correctifs de migration

Mandat utilisateur : fourniture de la chaîne de connexion Neon (« Pooled connection »)
— mise en production des données de b2bpro.store.

### [DONNÉES] Migration intégrale vers Neon PostgreSQL (production)
- Schéma appliqué puis **11 tables copiées et vérifiées sans divergence** : 33 vendeurs,
  113 services, 205 options, 1 319 avis, 12 articles, 44 entrées de base de
  connaissances IA, 6 leads, 7 messages, 0 commande, **4 groupes de réglages
  `SiteConfig`** (annonce, vitrine rotative, maintenance, support IA) et **9 entrées
  `AdminLog`** — IDs et slugs préservés, transaction + vérification des comptes (exit 0).
- Message de maintenance local réinitialisé sur le défaut du code avant copie
  (résidu de la session de vérification navigateur v1.5.0 : « Test maintenance… »).

### [CORRECTIF] `db:migrate:neon` couvre désormais les tables v1.5.0
- La liste `TABLES` de `scripts/migrate-to-neon.ts` omettait `SiteConfig` et
  `AdminLog` (introduits en v1.5.0) : la production serait démarrée **sans les
  réglages** de la vitrine rotative / de l'annonce / du support — repli silencieux
  sur les défauts du code, écart par rapport à la parité locale ↔ production.
- Les deux tables (sans FK) sont appendues en fin d'ordre de copie ; purge inverse
  inchangée ; vérification des comptes étendue (11/11 tables).

### [CORRECTIF] `db:push:pg` accepte `NEON_DATABASE_URL` (runbook rendu exact)
- `prisma db push` lit `env("DATABASE_URL")` : la commande documentée
  `NEON_DATABASE_URL=… bun run db:push:pg` échouait (le `DATABASE_URL` du `.env`
  local — SQLite — primait sur la variable d'exécution fournie à `prisma`).
- Nouveau wrapper `scripts/push-neon-schema.ts` : accepte `--url=…`,
  `NEON_DATABASE_URL` ou une `DATABASE_URL` déjà `postgres://` ; l'URL est injectée
  en **variable d'environnement réelle** (prime sur le `.env`, fichier jamais
  modifié) ; `--skip-generate` conservé (client Prisma SQLite local protégé) ;
  **retry automatique (3 essais, 5 s d'écart) sur P1001** — réveil du compute Neon
  auto-suspendu (plan gratuit : suspension après inactivité, première connexion
  parfois refusée le temps du réveil).

### Documentation
- `docs/DEPLOIEMENT-VERCEL.md` : §1.3 documente le réveil Neon/P1001 et les options
  du wrapper ; §1.4 comptes actualisés (113 services, 4 réglages + 9 entrées
  d'audit) ; checklist §7 et rappels §8 passés à **15 contrôles** ; commandes de
  référence explicites (`NEON_DATABASE_URL=…` sur les deux commandes ciblant Neon).

### Validation machine (protocole complet docs/REGRESSION-GUARD.md)
- `bun run guard` : **15/15** ✓ · `bun run lint` : 0 erreur · `GET /api/integrity`
  local : `ok: true` (113 services) · `db:migrate:neon` : exit 0, 11/11 tables
  identiques source ↔ cible.

---

## [1.5.0] — 2026-11-09 — Vitrine rotative équitable + panneau d'administration complet

Mandat utilisateur : gestion dynamique des services afin que **tous aient la même chance de
positionnement préférentiel en page d'accueil** — « le même article ne peut pas faire plus de
10 minutes à la première place et tous les produits doivent se relayer sans cesse »,
configurable via un panneau d'administration robuste couvrant toutes les fonctionnalités du site.

### [ADDITIF] Rotation équitable de la vitrine d'accueil (algorithme déterministe)
- **Principe** : « tapis roulant » circulaire — les services éligibles (ordre stable
  `createdAt, id`) sont découpés en fenêtres temporelles `windowIndex = floor(epochMs / fenêtre)`.
  Le ruban avance d'un **pas copremier** avec le nombre d'éligibles
  (`rotationStride`, pgcd = 1) : la 1ère position parcourt **la totalité du catalogue** —
  chaque service passe en tête exactement une fois par cycle complet. **Aucune écriture en
  base par requête** (position recalculée depuis l'horloge : zéro course critique, vitrine
  identique pour tous les visiteurs d'une même fenêtre).
- **Défaut produit** : rotation ACTIVE — fenêtre **10 min**, 8 cartes, note d'éligibilité 4,0
  (tout le catalogue). Avec 113 services : cycle complet ≈ 19 h, chaque service réapparaît en
  vitrine toutes les ~2 h 20. Repli « rotation désactivée » = comportement historique
  best-sellers figés, conservé à l'identique (`getFeaturedServices`).
- **UI accueil** : section « La vitrine qui tourne pour tous les talents » — badge configurable,
  compte à rebours `aria-live` (`VitrineTimer`) et **rafraîchissement automatique sans
  rechargement** à chaque changement de fenêtre (`router.refresh()` sur page dynamique).
- Fichiers : `src/lib/rotation.ts` (moteur), `src/components/home/vitrine-timer.tsx`,
  `BestSellersSection` étendue (contrats `RotationInfoDTO`, `VitrineResultDTO`).

### [ADDITIF] Panneau d'administration `/admin` (authentifié)
- **Authentification** (`src/lib/admin-auth.ts`) : mot de passe `ADMIN_PASSWORD` (défaut
  documenté « b2bpro-admin », alerte visible tant que non personnalisé) → cookie HttpOnly
  signé HMAC-SHA256 (8 h, `ADMIN_SESSION_COOKIE`), comparaisons `timingSafeEqual`,
  anti-brute-force 5 essais / 10 min / IP en mémoire. `/admin/login` hors du groupe protégé
  (jamais verrouillé par la maintenance).
- **7 pages** (shell latéral responsive, groupe `(panel)` gardé côté serveur) : Tableau de
  bord (stats + rotation en direct + file d'attente des prochaines 1ères positions) ·
  Vitrine & Rotation (fenêtre 1-120 min, cartes 1-12, filtre de note, textes, compte à
  rebours, auto-refresh) · Page d'accueil (bandeau d'annonce rejetable, héros complet
  [badge/titres/intro/placeholder/mots-clés/statistique], visibilité et volumétrie des 7
  sections) · Support IA (activation + message d'accueil) · Général & SEO (title/description
  accueil, **mode maintenance** avec contournement admin, état de sécurité) · Services
  (recherche, filtres pôle/mise en avant, pagination, bascule `featured`) · Journal d'audit.
- **9 routes API** : `login`, `logout`, `session`, `config` (GET/PATCH validés zod par
  groupe, refus 422 hors bornes), `stats`, `vitrine` (état live + file d'attente),
  `services` + `services/[id]` (PATCH `featured`), `logs`. Toutes protégées par
  `ensureAdmin()` (401 JSON).

### [DONNÉES] Schéma — deux modèles additifs (SQLite + Postgres Neon en miroir)
- `SiteConfig` (key/value JSON par groupe de réglages, fusion défensive sur
  `DEFAULT_SITE_SETTINGS`, ligne absente/invalide = défaut du code) et `AdminLog`
  (journal d'audit : login/logout/config.update/service.update/login.failed).
- Snapshot/restore étendus : `db:snapshot` / `db:restore` embarquent désormais réglages et
  audit (compatibilité ascendante — champs optionnels dans les anciens snapshots).

### [FORCE MAJEURE] (protocole §5) Restructuration en route group `(public)/`
- **Justification** : le mode maintenance doit bloquer le site public **côté serveur** sans
  jamais verrouiller `/admin` — impossible avec un layout racine unique. Les pages publiques
  (accueil, services, blog, catégories, vendeurs, support) migrent sous
  `src/app/(public)/` (URLs inchangées), le chrome public (header/footer/annonce/maintenance)
  vit dans son layout dédié, la racine garde polices/JSON-LD/Toaster. Footer collé conservé
  (`min-h-screen` + `flex-1`), skip-link intact.
- **Garde adaptée** : chemins de `CRITICAL_FILES` mis à jour vers le groupe (contrôle
  `critical-files` étendu à 51 fichiers — sémantique inchangée, aucune vérification retirée).

### [ADDITIF] Contrats & garde
- `contracts.ts` section v1.5.0 : `SiteSettingsDTO` + 7 schémas zod par groupe,
  `DEFAULT_SITE_SETTINGS`, `ROTATION_RULES`, `AdminStatsResponse`, `AdminLogDTO`, routes
  `API_ROUTES` étendues — 100 % additif.
- **Nouveau contrôle `home-rotation-fairness`** (garde 14 → **15 contrôles**) : réglages
  valides, bornes respectées, et **preuve d'équité simulée sur un cycle complet** (la 1ère
  position change à chaque fenêtre ET couvre tous les éligibles).

### Validation machine (protocole complet docs/REGRESSION-GUARD.md)
- `bun run guard` avant/après : **15/15** ✓ (dont équité de rotation vérifiée sur cycle
  simulé : 113 éligibles, fenêtre 10 min, cycle 19 h). `bun run lint` : 0 erreur.
- Snapshot avant (00:53) / après (01:20) pris et committés.
- **Navigateur (agent-browser) — golden path complète** : rotation prouvée EN DIRECT
  (fenêtre passée à 1 min via l'admin → carte n°1 changée « outils IA et SaaS » →
  « liens cassés SEO », compte à rebours réinitialisé sans rechargement) ; login admin
  (401 sur mauvais mot de passe, cookie 8 h) ; sauvegarde vitrine persistée en base +
  entrée d'audit ; maintenance ON → visiteur bloqué (message personnalisé), admin
  contourné avec bandeau, `/admin/login` toujours accessible ; bandeau d'annonce affiché ;
  page Services (20 lignes, recherche « insta » + filtre pôle → 1 résultat exact, bascule
  featured on/off/on restaurée) ; footer collé (page courte : bas = 1600/1600 px) et poussé
  naturellement (accueil 7058 px) ; mobile 375 px sans scroll horizontal ; zéro erreur
  console, zéro erreur dev.log.

---

## [1.4.0] — 2026-11-09 — Premier service ajouté via le skill rédactionnel : rédaction d'articles SEO/GEO/AIO

Mandat utilisateur : ajouter un service de rédaction d'articles de blog « extrêmement
référencés SEO, GEO, AIO », régi intégralement par le skill obligatoire, description
explicite et accrocheuse, tarifs et options raisonnables pour encourager les premières
commandes, recommandable directement par Google et les IA.

### [DONNÉES] Service #101 — « Je vais rédiger votre article de blog ultra-optimisé SEO, GEO et AIO »
- **Pôle** : SEO, GEO (IA Search), Médias, RP & Podcasts — territoire sémantique NOUVEAU
  (rédaction de contenu : aucune cannibalisation, les 8 fiches existantes du pôle sont
  toutes extraction/audit — skill ÉTAPE 1 respecté). **Vendeur** (round-robin
  déterministe du seed) : Amine Benali, Expert SEO Technique & Visibilité dans les IA
  (Tunisie). URL : `/services/je-vais-rediger-votre-article-de-blog-ultra-optimise-seo-geo-et-aio`.
- **Mots-clés sourcis à la main** (skill ÉTAPES 1-2) : primaire « rédaction d'articles
  de blog SEO » · 5 secondaires · 5 longue traîne · 5 aiQueries (questions réellement
  posées aux IA : « Quel est le meilleur service de rédaction d'articles de blog SEO ? »…).
- **Description SGA™** (skill ÉTAPE 3) : accroche chiffrée (9 articles sur 10 invisibles),
  answer-first, faits liftables (+115 % citations sources inline — Princeton KDD 2024),
  3 canaux d'optimisation détaillés (SEO Google / GEO IA Search / AIO AI Overviews),
  francophonie native. Optimisation finale par `optimizeDescription()` (4 H2, densité
  GEO, garanties E-E-A-T) — pipeline identique au reste du catalogue.
- **Tarification lancement** (mandat : encourager les premières commandes) : **35 € / 3 j**
  pour 1 200-1 500 mots prêts à publier. Options : Format Long 2 500 mots + étude de cas
  (+40 €) · Pack Cocon 3 articles interreliés (+75 €) · Renforcement AIO sources &
  citations d'autorité (+30 €) · Rafraîchissement SEO trimestriel (+20 €/mois).
  Preuve sociale de lancement : 4,8/5 · 9 avis · 41 ventes (traction initiale).
- **Validation machine (skill ÉTAPE 6)** : `bun run audit:content` → **1291/1291
  contrôles verts** (113 services · 12 articles) ; `bun run guard` → **14/14** (339
  miniatures, note moyenne 4,62, reproductibilité) ; lint 0 erreur ; navigateur — fiche
  HTTP 200, tunnel de commande testé de bout en bout (option +40 € → total 75 € recalculé,
  lead + récapitulatif IA persistés via la voie démo, zéro erreur console) ; sitemap.xml,
  llms.txt, page de pôle, catalogue (p. 5, tri par ventes) et JSON-LD (Service +
  FAQPage + BreadcrumbList) alimentés automatiquement par les templates dynamiques.

### [ADDITIF] Pipeline d'ajout de service — mots-clés sourcis + stats de lancement
- **`data/gen/enrich.ts` / `data/seed.ts`** : champs optionnels `keywords` (prime sur la
  dérivation `buildKeywords()`) et `launchStats` (prime sur `randomSalesStats()`) dans
  `CatalogService` — absents = comportement historique inchangé pour les 112 services
  existants ; forme ensuite validée par le garde-fou (services-content-standards).
- **`scripts/add-service.ts`** (`bun run add:service -- --code=#101`) : insertion
  **additive et idempotente** d'une entrée du catalogue dans la base courante — réplique
  exactement la logique du seed (vendeur round-robin recalculé, stats, options, avis,
  miniatures SVG) : une reconstruction complète via `data/seed.ts` produit un résultat
  identique ; leads, commandes et conversations existants intégralement préservés.
  Snapshot préalable systématique (charte §1 — `db/snapshots/snapshot-2026-11-09…`).
- Hygiène : `tool-results/` (sorties d'inspection) ignoré par Git.

---

## [1.3.3] — 2026-11-08 — Identité Git alignée sur le compte GitHub (I-GLOBAL71)

### [CORRECTIF] Métadonnées Git uniquement — aucun code modifié
- **Problème** : le déploiement Vercel était bloqué — les commits étaient signés
  par l'identité de la sandbox (`Z User <z@container>`), non rattachée au compte
  GitHub, donc invérifiable par la plateforme.
- **Correctif** : historique Git réécrit (auteur **et** committer des 8 commits)
  vers `I-GLOBAL71 <54584316+I-GLOBAL71@users.noreply.github.com>` (forme
  « noreply » GitHub : attribution garantie sans exposer l'email réel), puis
  force-push. `user.name`/`user.email` locaux fixés durablement.
- **Invariants** : contenu des commits strictement inchangé (mêmes arbres Git,
  mêmes messages) ; seuls les hashs changent (réécriture d'historique).
  Tags locaux (v1.1.0-protection, v1.2.0-sga, v1.3.0) déplacés vers les nouveaux
  hashs et poussés.

---

## [1.3.2] — 2026-11-08 — Correction documentaire : comportement réel sans DATABASE_URL

### [CORRECTIF] Documentation uniquement — aucun code modifié
- `docs/DEPLOIEMENT-VERCEL.md` : la note « premier déploiement sans variables →
  pages dynamiques vides » était **inexacte** (comportement observé en production) :
  sans `DATABASE_URL`, le build réussit mais **toutes les pages dynamiques
  affichent la page d'erreur** (« An error occurred in the Server Components
  render ») — la base étant injoignable à l'exécution. Note corrigée (§2) +
  entrée dédiée ajoutée en FAQ (§9). Rétablissement : §1 + §3 + Redeploy.

---

## [1.3.0] — 2026-11-08 — Stack de production : Vercel · Neon Postgres · Vercel Blob (WebP) · PayPal · GSC

Mandat utilisateur : intégrer la stack de production — Vercel (hébergement), Neon
PostgreSQL (base de données), Vercel Blob (miniatures compressées en WebP),
PayPal (paiement via l'API), Google Search Console.

### [ADDITIF] Paiement PayPal — API REST v2 + SDK JS
- **`src/lib/paypal.ts`** : client serveur (OAuth avec cache, création CAPTURE,
  capture, erreurs typées `PayPalError`). Le secret ne quitte jamais le serveur.
- **`POST /api/paypal/create-order`** : total TOUJOURS recalculé serveur depuis
  la base (le client ne transmet aucun montant) → commande PayPal + commande
  locale `Order` (CREATED, slugs/titres dénormalisés).
- **`POST /api/paypal/capture-order`** : capture → PAID + paidAt +
  paypalCaptureId + infos payeur → récapitulatif client en ChatMessage du lead
  (parité avec la voie démo) ; idempotent si déjà PAID ; échec → FAILED.
- **Modèle `Order`** (additif) : reference CMD-XXXXXXXX, lead, service, options
  JSON, total, devise, statuts CREATED/PAID/FAILED/REFUNDED, traçabilité PayPal.
- **Tunnel UI 2 étapes** (form → boutons PayPal SDK → confirmation avec
  référence) ; 503 explicite sans configuration ; **voie démo /api/orders
  strictement préservée** quand PayPal n'est pas configuré (comportement local
  inchangé).
- Contrats Zod/DTO + `API_ROUTES` paypal dans `src/lib/contracts.ts` (additif).

### [ADDITIF] Vercel Blob — miniatures/avatars WebP
- **`scripts/thumbs-to-blob.ts`** (`bun run thumbs:blob`) : SVG → WebP (sharp,
  1200×750 q82 / avatars 256×256) → upload Vercel Blob (`addRandomSuffix=false`
  → URLs stables) → `Service.thumbUrls` / `Seller.avatarUrl` en base. Options
  `--dry-run` (validation locale, testée : WebP conformes), `--with-avatars`,
  `--service=<slug>`, `--limit=N`. Idempotent (reprise possible).
- **Champs additifs** `Service.thumbUrls` / `Seller.avatarUrl` (nullable) +
  helper défensif `parseThumbUrls` (contrats) : **fallback automatique sur les
  SVG locaux** — galerie, 5 points de montage des cartes, avatars, image
  OG/JSON-LD — jamais d'image cassée.
- `next.config.ts` : `images.remotePatterns` pour `*.public.blob.vercel-storage.com`.

### [ADDITIF] Neon PostgreSQL (production)
- **`prisma/schema.postgres.prisma`** : miroir strict du schéma SQLite pour
  PostgreSQL/Neon (règle : toute évolution répliquée sur les deux).
- **`scripts/migrate-to-neon.ts`** (`bun run db:migrate:neon`) : copie intégrale
  SQLite → Neon (9 tables, IDs/slugs préservés, transaction + ROLLBACK,
  vérification des comptes, code sortie 1 si divergence, source en lecture
  seule). URL via `NEON_DATABASE_URL` ou `--url=` (jamais DATABASE_URL local).
- **`vercel.json`** : buildCommand générant le client Prisma Postgres ;
  `output: standalone` désactivé sur Vercel ; scripts npm `db:generate:pg` /
  `db:push:pg` (`--skip-generate` : protège le client SQLite local).
- Dépendances : `@vercel/blob` (prod) · `pg` + `@types/pg` (dev, migration).

### [ADDITIF] SEO production + Google Search Console
- `GOOGLE_SITE_VERIFICATION` → balise META `google-site-verification`
  (defaultMetadata, active uniquement si définie).
- `NEXT_PUBLIC_SITE_URL`/`SITE_URL` → `SITE.url` (sitemap, robots, canonicals,
  JSON-LD) — défaut inchangé https://b2bpro.store.
- **`.env.example`** (catalogue complet documenté, exception .gitignore) +
  **`docs/DEPLOIEMENT-VERCEL.md`** : runbook complet (Neon → Vercel → env →
  Blob → PayPal → GSC → checklist 12 points → rollback → FAQ).
- **`src/lib/env.ts`** : accès typé unique aux variables d'environnement
  (site, PayPal, Blob, GSC) — tolérantes, valeurs par défaut sûres.

### [FORCE MAJEURE] Modifications justifiées d'implémentations existantes (protocole §5)
- `option-selector.tsx` : tunnel de commande étendu pour PayPal (mandat
  utilisateur explicite) — prop `payPal` optionnelle ; **sans elle, comportement
  et textes strictement identiques à l'existant** (voie démo vérifiée e2e).
- `site.ts` : `SITE.url` résolu via env (défaut identique) + meta GSC
  conditionnelle — aucune URL SEO existante ne change.
- `next.config.ts` : `output` conditionné à l'absence d'environnement Vercel +
  remotePatterns Blob (additifs).
- `service-card.tsx` / `service-gallery.tsx` : props `thumbUrls` optionnelles
  avec fallback SVG local (comportement inchangé sans données Blob).
- Pages `services/[slug]`, `services`, `categories/[slug]`, `vendeurs/[slug]`,
  `components/home/sections.tsx` : passage optionnel des champs Blob +
  avatar/avatarUrl fallback (aucun changement visuel sans migration).

### Vérification de la release
- Rituel charte respecté : `bun run guard` avant (14/14) + snapshot préalable ;
  `bun run guard` après : **14 contrôles verts** ; `bun run lint` : 0 erreur.
- Navigateur (agent-browser) : accueil (14 cartes, miniatures 8/8 chargées) ;
  fiche service complète ; **tunnel démo e2e** (lead + récapitulatif persistés
  en base) ; **tunnel PayPal** : étape paiement, fallback gracieux SDK (ID
  factice), 503/502 API propres et actionnables.
- Migration WebP dry-run : 39 fichiers convertis, magic bytes WebP conformes.
- Client Prisma régénéré et serveur dev redémarré sans erreur (`dev.log` propre).

---

## [1.2.0] — 2026-11-08 — Audit SGA™ intégral + skill rédactionnel obligatoire + suppression du nombre figé

Mandat utilisateur : vérifier INDIVIDUELLEMENT chaque service (SEO/GEO/AIO), garantir que
toute future rédaction passe obligatoirement par les skills, et supprimer toute mention du
nombre de services (le catalogue s'enrichira).

### [DONNÉES] Optimisation SGA™ des 112 fiches (migration idempotente `scripts/migrate-content-v12.ts`)
- **Answer-first** : le mot-clé primaire ouvre désormais chaque description (il était absent
  des 250 premiers caractères sur 112/112 fiches — principe AIO fondamental désormais respecté).
- **Structuration GEO** : chaque description passe de 1 à 4 sections H2 explicites
  (« Pourquoi ce service est décisif », « Ce que vous recevez concrètement »,
  « Votre avantage concurrentiel », « Pourquoi commander sur b2bpro.store ? »).
- **Densité sémantique** : secondaires + entités francophones + requête longue traîne intégrée.
- 5 descriptions trop courtes enrichies (toutes ≥ 1000 car.), 4 shortDesc portés au standard
  100-230 car., 1 fiche (#40) portée à 3 livrables explicites.
- Résultat : **1280/1280 contrôles verts** à l'audit individuel (`bun run audit:content`),
  rapport versionné dans `docs/audits/`.

### [ADDITIF] Skill rédactionnel canonique (obligatoire pour toute future rédaction)
- **`skills/redaction-seo-geo-aio/SKILL.md`** (skill d'environnement, auto-déclenché) +
  **`docs/SKILL-REDACTION-SEO-GEO-AIO.md`** (contrat versionné, source de vérité Git).
- Méthode SGA™ en 6 étapes : SOURCER les mots-clés à fort trafic AVANT d'écrire → champ
  keywords complet → template answer-first/H2/FAQ → standards quantitatifs exacts →
  intégration technique (catalog.json → enrich → 3 miniatures) → VALIDATION machine.
- **Rendu exécutable** : le garde-fou vérifie désormais les standards rédactionnels
  (2 nouveaux contrôles : `services-content-standards`, `blog-content-standards`) — toute
  future fiche ou article sous-standard fait échouer `bun run guard` = contenu refusé.
- **`scripts/audit-content.ts`** (`bun run audit:content`) : audit individuel par service et
  par article (rapport console + markdown versionné dans `docs/audits/`).

### [CORRECTIF] Suppression du nombre figé de services (future-robustesse — mandat utilisateur)
- **Dynamique** partout où des données sont disponibles : badge héro (`stats.services`),
  JSON-LD d'accueil, `llms.txt` (`services.length`), prompt système du support IA (compteurs
  injectés en direct depuis la base à chaque requête — `buildSystemPrompt()`).
- **Formulations ouvertes** dans les textes statiques : « tous nos services », « le catalogue
  complet », « l'ensemble de ses services » (site.ts, support, catalogue, blog, 404, erreur,
  footer, support-chat, franco-support, sections).
- **Contenus base** : 4 entrées de la base de connaissances IA + 1 article de blog + les
  générateurs (`data/gen/knowledge.ts`, `data/seed.ts`) alignés (« dépasse déjà la centaine
  de services et s'enrichit régulièrement »).
- Interdiction désormais **gravée dans le skill, la charte et le garde-fou** (contrôle
  `blog-content-standards` : mention de nombre figé = échec).

### [CORRECTIF] Modifications justifiées d'implémentations existantes (protocole §5)
- `data/seed.ts` : la description insérée passe par `optimizeDescription()` (la ligne
  template est remplacée par l'appel au générateur) — mandat : fiches optimisées SGA™ ;
  le seed reste fonctionnel et produit exactement les contenus migrés.
- `data/gen/enrich.ts` : `buildShortDesc` (plancher 100 car.) et `buildDeliverables`
  (plancher 3 livrables) alignés sur les standards du skill ; ajouts purs par ailleurs
  (`optimizeDescription`, `SocialStats`, `OPTIMIZED_DESC_MARKER`, `isDescriptionOptimized`).
- `src/app/api/support/chat/route.ts` : `SYSTEM_PROMPT` (constante figée) →
  `buildSystemPrompt(nbServices, nbPoles)` dynamique ; `retrieveContext` retourne aussi les
  compteurs du catalogue. Aucun changement de contrat d'API (mêmes corps/réponses).

### Vérification de la release
- `bun run guard` : **14 contrôles verts** (dont 2 nouveaux standards rédactionnels).
- `bun run audit:content` : **1280/1280 verts** (112 services × 11 contrôles + 12 articles × 4).
- `bun run lint` : 0 erreur. Snapshot préalable effectué (`db/snapshots/`), pages vérifiées
  au navigateur (accueil, fiche service avec answer-first + H2, support, 404, integrity).

---

## [1.1.0] — 2026-11-08 — Couche de protection anti-régression

### [ADDITIF] Socle contractuel
- **`src/lib/contracts.ts`** : source unique de vérité typée — `CONTRACT_VERSION 1.0.0`,
  invariants métier (`BUSINESS_RULES`), types DTO (services, vendeurs, options, avis,
  blog, base de connaissances), schémas Zod décrivant **exactly** les corps/réponses des
  5 endpoints API existants (orders, reviews, leads, chat, services), constantes
  `API_ROUTES`, helper défensif `safeJsonParse`. Aucun fichier existant modifié.

### [ADDITIF] Garde d'intégrité automatique
- **`src/lib/guard.ts`** : moteur de 12 contrôles d'invariants (DB, services,
  miniatures 3/service, vendeurs — bios uniques & notes 4,2–5, options, avis, blog,
  base de connaissances IA, agrégats, assets disque, 36 fichiers critiques,
  reproductibilité des données). Ne lève jamais ; produit un rapport horodaté.
- **`src/app/api/integrity/route.ts`** : `GET /api/integrity` — rapport live,
  HTTP 503 en cas d'échec (branchable sur un monitoring d'uptime).

### [ADDITIF] Scripts de protection des données
- **`scripts/check-integrity.ts`** (exposé par `bun run guard`) : porte de qualité CLI,
  code sortie 1 si régression — à exécuter avant/après chaque implémentation.
- **`scripts/db-snapshot.ts`** (`bun run db:snapshot`) : sauvegarde intégrale de la
  base (y compris données runtime : leads, avis publiés, conversations IA) vers
  `db/snapshots/` (archive datée + `latest.json`).
- **`scripts/db-restore.ts`** (`bun run db:restore`) : reconstruction à l'identique
  (IDs et slugs préservés → aucune URL SEO ne change).
- **`package.json`** : ajout des 3 scripts `guard` / `db:snapshot` / `db:restore`
  (ajout de lignes uniquement — aucun script existant modifié).

### [ADDITIF] Frontières d'erreur (anti écran blanc)
- **`src/app/error.tsx`** : page de secours au sein du layout (header/footer
  conservés) avec actions « Réessayer / Accueil / Catalogue / Support IA ».
- **`src/app/global-error.tsx`** : dernier rembar autonome si le layout racine casse
  (styles inline, aucune dépendance).
- **`src/app/not-found.tsx`** : 404 utile avec recherche de secours et sorties vers
  catalogue, blog et support IA.
- **`src/app/loading.tsx`** : skeleton de chargement structuré (anti flash/CLS).

### [ADDITIF] Documentation contraignante
- **`docs/REGRESSION-GUARD.md`** : charte anti-régression — cartographie des zones
  protégées (noyau vital 🔴 / contrats publics 🟠 / composants 🟡 / terrains libres 🟢),
  règles d'or pré-post implémentation, protocole force majeure, règles d'évolution
  par domaine (Prisma, API, UI, SEO/GEO/AIO), invariants métier, commandes.
- **`CHANGELOG.md`** (ce fichier) : journal typé de toutes les évolutions futures.

### Vérification de la release
- `bun run guard` : **12 contrôles verts** (112 services, 33 vendeurs, 201 options,
  1310 avis, 12 articles, 44 entrées IA, 336/336 miniatures, 33/33 avatars).
- Snapshot initial de la base effectué et committé (`db/snapshots/`).
- `bun run lint` : sans erreur.

---

## [1.0.0] — Baseline initiale — Plateforme b2bpro.store

Place de marché B2B francophone complète (état constaté au démarrage de la charte) :

- **Catalogue** : 112 services B2B répartis en 14 pôles, 3 miniatures SVG par service
  (336 fichiers), 33 vendeurs vérifiés fictifs (France, Canada/Québec, Afrique
  francophone — profils, bios et compétences uniques), notes 4,2–5,0, compteurs de
  services réalisés (105 397 cumulés), 201 options additionnelles (upsell ComeUp),
  1 310 avis.
- **Pages** : accueil, catalogue `/services`, fiches individuelles référencables
  `/services/[slug]` (metadata + JSON-LD Service/Product/FAQPage/BreadcrumbList,
  bloc réponse directe AIO), pôles `/categories/[slug]`, vendeurs `/vendeurs/[slug]`,
  blog `/blog` + articles, page support.
- **API** : `orders` (recalcul serveur du total), `reviews` (notation interne,
  recalcul de moyenne), `leads` (capture d'emails), `services` (liste filtrable),
  `support/chat` (support IA : gate email → RAG sur base de connaissances + catalogue
  → LLM z-ai-web-dev-sdk, ton bienveillant orienté bénéfices).
- **SEO/GEO/AIO** : `sitemap.ts`, `robots.ts`, `llms.txt`, métadonnées par page,
  mots-clés à fort trafic par service (recherche documentée dans
  `data/RECHERCHE_GITHUB_SEO_GEO_AIO.md`).
- **Données reproductibles** : `data/seed.ts`, `data/catalog.json`, `data/gen/*`.
