# Authentification Google + Email (lien magique) — Guide pas-à-pas

> Version 2.0.0 — b2bpro.store
> Public : débutant total. Durée : **15 minutes** environ (10 pour Google, 5 pour Gmail).
> Aucune ligne de code à écrire : tout se configure par variables d'environnement.

## Ce que vos clients vivent (déjà en place)

1. Le visiteur clique **« Se connecter »** en haut du site.
2. Deux choix, zéro friction :
   - **Continuer avec Google** — un clic, consentement Google, il est connecté ;
   - **Continuer avec son email** — il saisit son adresse, reçoit un email
     « Votre lien de connexion », clique sur **« Me connecter »**, et c'est fini.
     Aucun mot de passe à créer, à retenir ou à oublier.
3. Une fois connecté : ses **commandes sont préremplies** (nom + email), et la page
   **/account** liste ses commandes avec leur statut de paiement.
4. Le bouton de connexion ne s'affiche que si au moins une méthode est configurée :
   tant que vous n'avez rien configuré, le site marche exactement comme avant
   (commande en invité) — jamais un bouton qui échoue.

---

## Étape 0 — Préparer le terrain (2 min)

Où vivent les secrets ? Dans le fichier **`.env`** en local, et dans le tableau de
bord **Vercel** en production (Settings → Environment Variables).

Principe d'or : **en local → `.env`, en production → Vercel**. Les valeurs sont
strictement privées (ne jamais les committer sur GitHub).

Le fichier `.env.example` (section « Authentification clients v2.0.0 ») recense
toutes les variables ci-dessous avec le même nommage exact.

---

## Étape 1 — Google OAuth (10 min)

### 1.1 Ouvrir la console Google Cloud

1. Allez sur **https://console.cloud.google.com** et connectez-vous avec votre
   compte Google.
2. En haut, cliquez sur la liste déroulante des projets → **« Nouveau projet »**.
3. Nom : `b2bpro-store`. Cliquez **Créer** et attendez (~30 s), puis sélectionnez-le.

### 1.2 Configurer l'écran de consentement (l'écran que verront vos clients)

1. Menu gauche → **« API et services »** → **« Écran de consentement OAuth »**.
2. Type d'utilisateur : **« Externe »** → Créer.
3. Renseignez :
   - Nom de l'application : `b2bpro.store` ;
   - Email d'assistance utilisateur : votre adresse ;
   - Emails de contact : la même.
4. **Écrans** : « Informations » puis « Publics ». Pour le moment, Google classe
   l'app en **« Test »** : seuls les emails que vous ajoutez comme utilisateurs
   de test peuvent se connecter — parfait pour valider avant la mise en prod.
5. Publier pour tout le monde : bouton **« Publier l'application »** (Approuvé
   automatiquement car nous ne demandons que `email` + `profile`, données
   sensibles nulles).

### 1.3 Créer les identifiants (les 2 clés à copier)

1. Menu gauche → **API et services** → **« Identifiants »** → **« Créer des
   identifiants »** → **« ID client OAuth »**.
2. Type d'application : **« Application Web »** → nom `b2bpro-store-web`.
3. **URI de redirection autorisées** — copiez EXACTEMENT (au caractère près) :
   - développement : `http://localhost:3000/api/auth/callback/google`
   - production : `https://b2bpro.store/api/auth/callback/google`
4. Créer → une fenêtre affiche **l'ID client** et **le code secret** :
   - ID client → variable `GOOGLE_CLIENT_ID`
   - Secret → variable `GOOGLE_CLIENT_SECRET`

### 1.4 Copier dans `.env` (local)

```bash
GOOGLE_CLIENT_ID="1234567890-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnop"
```

Redémarrez `bun run dev` (les variables d'environnement ne se relisent pas à chaud).

### 1.5 Copier dans Vercel (production)

1. Vercel → votre projet → **Settings → Environment Variables**.
2. Ajoutez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, environnement
   **Production** (ajoutez aussi Preview si vous testez les previews).
3. **Redeploy** (obligatoire : le runtime ne voit les variables qu'au démarrage).

Test : sur `https://b2bpro.store`, cliquez « Se connecter » → « Continuer avec
Google » → choisissez votre compte → vous êtes revenu et connecté. ✅

---

## Étape 2 — Email par lien magique via Gmail (5 min)

Vos clients ne créent **aucun mot de passe** : ils reçoivent un email contenant
un bouton « Me connecter », valable 24 h. L'email part par votre compte Gmail,
via un **mot de passe d'application** (16 caractères) — jamais votre mot de
 passe principal, jamais le 2FA : Google exige la validation en deux étapes
pour délivrer ces mots de passe, c'est normal et c'est plus sûr.

### 2.1 Activer la validation en deux étapes (si pas déjà fait)

1. Allez sur **https://myaccount.google.com/security**.
2. Section « Se connecter à Google » → **Validation en deux étapes** → suivre
   l'assistant (2 minutes, SMS ou application).

### 2.2 Générer le mot de passe d'application

1. Sur la même page Sécurité, recherchez **« Mots de passe des applications »**
   (ou ouvrez directement https://myaccount.google.com/apppasswords).
2. Nom : `b2bpro-mail` → **Créer**.
3. Google affiche un mot de passe de **16 caractères** (ex.
   `abcd efgh ijkl mnop`). Copiez-le **sans les espaces**.

### 2.3 Copier dans `.env` (local)

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votreadresse@gmail.com"
SMTP_PASSWORD="abcdefghijklmnop"          # les 16 caractères, sans espaces
SMTP_FROM="b2bpro.store <votreadresse@gmail.com>"   # optionnel, nom affiché
```

> Astuce : les 5 000 premiers envois/jour sont gratuits côté Gmail. La double
> authentification étant active, aucun mot de passe principal ne circule jamais.

Redémarrez `bun run dev`, puis testez : « Se connecter » → saisissez votre email →
« Recevoir mon lien de connexion » → vérifiez votre boîte (y compris spams) →
cliquez « Me connecter » dans l'email → connecté. ✅

### 2.4 Copier dans Vercel (production)

Mêmes 5 variables SMTP_* dans Vercel → Settings → Environment Variables
(environnement **Production**) → **Redeploy**.

---

## Étape 3 — Le secret de session (obligatoire en production)

```bash
openssl rand -base64 32
```

Copiez le résultat dans :

- `.env` local : `NEXTAUTH_SECRET="…"`
- Vercel (Production) : `NEXTAUTH_SECRET`

`NEXTAUTH_URL` : en local `http://localhost:3000` (déjà dans `.env`) ; sur Vercel,
**ne définissez rien** — l'URL est déduite automatiquement du domaine.

---

## Diagnostic express

| Symptôme | Cause la plus fréquente | Correction |
|---|---|---|
| Bouton Google absent | `GOOGLE_CLIENT_ID/SECRET` non lus | Vérifier `.env` / Vercel + **Redeploy** |
| `redirect_uri_mismatch` | URI de redirection fautive | Recopier exactement `/api/auth/callback/google` |
| Google bloque « app non vérifiée » | App restée en mode Test | Publier l'app OU ajouter l'email test |
| Aucun email reçu | SMTP non configuré / spams | Vérifier `SMTP_*` + regarder les indésirables |
| `EmailSigninError` serveur | Mot de passe applicatif faux (espaces, ancien) | Régénérer un mot de passe d'application |
| Bouton email absent en prod | SMTP absent en production | Ajouter les 5 variables `SMTP_*` sur Vercel |
| `?error=Callback` après Google (v2.1.3) | Tables/index d'auth absents de Neon — l'adaptateur exige notamment `@@unique([provider, providerAccountId])` sur `Account` | **Redeploy** : le garant de schéma du build (`scripts/ensure-neon-schema.ts`, visible `[neon-schema]` dans le log Vercel) crée tables et index. Vérifier ensuite la sonde « Tables d'authentification » du tableau de bord `/admin` |
| `?error=OAuthAccountNotLinked` | Email déjà utilisé en lien magique puis Google | Corrigé en v2.1.3 (`allowDangerousEmailAccountLinking` — sûr : les deux méthodes prouvent la propriété de l'email) |

En **développement sans SMTP**, le lien magique est tracé dans la console du
serveur (`dev.log`) — le parcours complet reste testable sans aucune clé.

---

## Ce qui tourne sous le capot (pour la culture)

- **NextAuth v4** (`/api/auth/*`) : sessions **JWT** en cookies httpOnly signés
  (`NEXTAUTH_SECRET`), adaptateur **Prisma** — tables `User`, `Account`,
  `Session`, `VerificationToken` (miroir SQLite / Neon Postgres).
- **Lien magique** : jeton à usage unique stocké en base, valable 24 h,
  envoyé via **nodemailer** (STARTTLS 587 / SSL 465) avec un email HTML
  francophone aux couleurs b2bpro.store.
- **Sans friction** : préremplissage automatique du tunnel de commande
  (nom + email), page `/account` (commandes + statuts de paiement), déconnexion
  en un clic. Les commandes **en invité restent possibles** : aucune barrière
  d'entrée — l'authentification n'est jamais obligatoire pour acheter.
