/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  b2bpro.store — Authentification clients (v2.0.0)
 *  Google (OAuth) + lien magique par email (SMTP Gmail, mot de passe applicatif)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Configuration 100 % par variables d'environnement (voir .env.example et
 *  docs/AUTHENTIFICATION-GOOGLE-EMAIL.md pour le guide pas-à-pas) :
 *
 *    • Google   : GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *      (Google Cloud Console → OAuth 2.0, URI de redirection :
 *       https://b2bpro.store/api/auth/callback/google et localhost:3000 en dev)
 *
 *    • Email   : SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASSWORD
 *      (Gmail : mot de passe applicatif 16 caractères, validation 2 étapes
 *       obligatoire). Le visiteur saisit son email, reçoit un lien de
 *       connexion valable 24 h, clique, et c'est terminé — zéro mot de passe
 *       à retenir.
 *
 *  En développement sans SMTP configuré, le lien magique est tracé dans la
 *  console serveur (dev.log) au lieu d'être envoyé : le parcours reste
 *  testable de bout en bout. En production sans SMTP, la méthode email est
 *  simplement masquée de l'interface (jamais un bouton qui échoue).
 *
 *  Sessions : stratégie JWT (cookies httpOnly signés) + adaptateur Prisma
 *  pour les comptes (User / Account / VerificationToken).
 */
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";

// ─── Disponibilité des fournisseurs (même logique côté layout/UI) ───────────

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD,
  );
}

export function isEmailAuthAvailable(): boolean {
  // Dev sans SMTP → mode « console » (lien magique tracé serveur).
  // Production → SMTP obligatoire pour proposer la méthode.
  return isSmtpConfigured() || process.env.NODE_ENV !== "production";
}

/** État consolidé, transmis aux composants serveur → UI de connexion. */
export function getAuthProvidersStatus() {
  return {
    google: isGoogleAuthConfigured(),
    email: isEmailAuthAvailable(),
  };
}

/**
 * v2.1.0 — La finalisation d'une commande EXIGE un client connecté dès que
 * l'authentification est configurée (Google ou lien magique email).
 *
 *   • Serveur-autorité : l'email de SESSION devient l'identité du lead (vérifié
 *     par Google ou par clic sur le lien email) — plus d'email fantôme saisi
 *     à main levée, plus de commande « anonyme » impossible à tracer.
 *   • Front : le tunnel de commande remplace le formulaire par un panneau
 *     « connexion requise » tant que la session est absente.
 *
 * Escape hatch (environnement de test uniquement) : ORDER_ALLOW_GUEST=true
 * rétablit les commandes invité SUR CET ENVIRONNEMENT — sans jamais toucher
 * aux autres déploiements.
 */
export function isAuthRequiredForOrders(): boolean {
  if (process.env.ORDER_ALLOW_GUEST?.trim().toLowerCase() === "true") {
    return false;
  }
  return isGoogleAuthConfigured() || isEmailAuthAvailable();
}

// ─── Lien magique : envoi réel via SMTP, ou trace console en dev ────────────

/** Expéditeur lisible : « b2bpro.store » en face du compte Gmail configuré. */
function smtpFrom(): string {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@b2bpro.store";
  return /</.test(raw) ? raw : `b2bpro.store <${raw}>`;
}

async function sendMagicLinkEmail(params: {
  identifier: string;
  url: string;
  expires: Date;
}): Promise<void> {
  const { identifier, url, expires } = params;

  if (!isSmtpConfigured()) {
    // Mode développement : aucun SMTP → le lien part dans la console serveur.
    // L'URL s'affiche SEULE, sur sa propre ligne, jamais tronquée.
    console.log(
      [
        "",
        "──────────────── [auth-email] Mode dev : SMTP non configuré ────────────────",
        `  Email  : ${identifier}`,
        `  Valable jusqu'au : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(expires)}`,
        `  Lien magique (ouvrir pour se connecter) :`,
        `  ${url}`,
        "────────────────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const validity = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(expires);

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden">
        <tr>
          <td style="background:linear-gradient(90deg,#059669,#34d399);padding:24px 32px">
            <span style="font-size:20px;font-weight:800;color:#ffffff">b2bpro<span style="opacity:.85">.store</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:21px;color:#1c1917">Votre lien de connexion</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#57534e">
              Bonjour,<br/>
              Cliquez sur le bouton ci-dessous pour vous connecter à votre espace
              b2bpro.store avec l'adresse <strong>${identifier}</strong>.
              Aucun mot de passe à retenir.
            </p>
            <p style="margin:0 0 24px">
              <a href="${url}"
                 style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;
                        font-size:15px;font-weight:700;padding:14px 32px;border-radius:9999px">
                Me connecter
              </a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#57534e">
              Le bouton ne fonctionne pas ? Copiez-collez ce lien dans votre navigateur :
            </p>
            <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#059669">${url}</p>
            <p style="margin:0;font-size:12px;line-height:18px;color:#a8a29e">
              Ce lien est personnel, valable jusqu'au ${validity}. Si vous n'êtes pas à
              l'origine de cette demande, ignorez simplement cet email — votre adresse
              reste protégée. Les paiements restent séquestrés jusqu'à validation du livrable.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:11px;color:#a8a29e">
            b2bpro.store — place de marché B2B francophone · ${SITE.url}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: smtpFrom(),
    to: identifier,
    subject: "Votre lien de connexion b2bpro.store",
    text: `Bonjour,\n\nConnectez-vous à b2bpro.store avec ce lien (valable jusqu'au ${validity}) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html,
  });
}

// ─── Options NextAuth ────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    // JWT : cookies httpOnly signés — les comptes vivent en base, pas les sessions.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours de confort « sans friction ».
  },
  providers: [
    ...(isGoogleAuthConfigured()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              // Sélecteur de compte systématique : indispensable pour les
              // comptes professionnels multi-profils Google.
              params: { prompt: "select_account" },
            },
          }),
        ]
      : []),
    ...(isEmailAuthAvailable()
      ? [
          EmailProvider({
            from: smtpFrom(),
            server: {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: Number(process.env.SMTP_PORT || 587) === 465,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
              },
            },
            maxAge: 24 * 60 * 60, // lien magique valable 24 h
            sendVerificationRequest: async ({ identifier, url, expires }) => {
              try {
                await sendMagicLinkEmail({ identifier, url, expires });
              } catch (e) {
                console.error("[auth-email] Échec d'envoi du lien magique", e);
                // Message FR explicite : jamais d'erreur anglophone brute.
                throw new Error("L'envoi de l'email de connexion a échoué. Réessayez dans un instant.");
              }
            },
          }),
        ]
      : []),
  ],
  pages: {
    // Pages natives remplacées par nos composants maison ; les erreurs OAuth
    // atterrissent sur l'accueil plutôt que sur un écran anglais.
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};
