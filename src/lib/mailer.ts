/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  b2bpro.store — Notifications email au propriétaire-prestataire (v2.2.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le propriétaire de la plateforme est AUSSI l'unique prestataire humain.
 * L'adresse OWNER_EMAIL (repli automatique : SMTP_USER) reçoit un email pour :
 *   • chaque NOUVELLE COMMANDE (création PayPal ou voie démo) ;
 *   • chaque PAIEMENT CAPTURÉ (transaction décisive) ;
 *   • chaque nouvelle CONVERSATION avec l'assistant prestataire IA ;
 *   • chaque QUESTION CLIENT adressée au prestataire humain (email URGENT).
 *
 * Règle d'or : une notification ne doit JAMAIS faire échouer l'action métier.
 *   • aucune fonction de ce fichier ne lève — les échecs sont tracés serveur ;
 *   • délais bornés (connexion 8 s, socket 12 s) : le pire cas n'ajoute que
 *     quelques secondes à la réponse HTTP ;
 *   • sans SMTP configuré (développement), le contenu part dans la console
 *     serveur (dev.log) — même convention que le lien magique de src/lib/auth.ts.
 *
 * Variables (voir .env.example) :
 *   OWNER_EMAIL  — boîte du propriétaire notifiée (repli : SMTP_USER)
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_FROM
 */

import { SITE } from "@/lib/site";

// ─── Configuration (jamais de secret divulgué hors de ce module) ─────────────

/** SMTP opérationnel ? (même règle que src/lib/auth.ts, sans couplage.) */
function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD,
  );
}

/** Adresse du propriétaire-prestataire notifiée (OWNER_EMAIL, repli SMTP_USER). */
export function getOwnerEmail(): string | null {
  const explicit = process.env.OWNER_EMAIL?.trim();
  if (explicit) return explicit;
  return process.env.SMTP_USER?.trim() || null;
}

/** L'adresse propriétaire est-elle notifiable ? (configurée OU mode dev console.) */
export function isOwnerNotifiable(): boolean {
  return getOwnerEmail() !== null || process.env.NODE_ENV !== "production";
}

/** Expéditeur lisible — identique au lien magique (cohérence de boîte). */
function smtpFrom(): string {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@b2bpro.store";
  return /</.test(raw) ? raw : `b2bpro.store <${raw}>`;
}

// ─── Gabarit HTML sobre (identité graphique du site, zéro émoticône) ────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ligne valeur mono-espacée : URLs/références restent lisibles et wrappent. */
const MONO = "font-family:Consolas,'Courier New',monospace;word-break:break-all";

function emailShell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden">
        <tr>
          <td style="background:linear-gradient(90deg,#059669,#34d399);padding:22px 32px">
            <span style="font-size:20px;font-weight:800;color:#ffffff">b2bpro<span style="opacity:.85">.store</span></span>
            <span style="float:right;font-size:11px;font-weight:700;color:#ffffff;opacity:.9;letter-spacing:.08em">NOTIFICATION</span>
          </td>
        </tr>
        <tr><td style="padding:30px 32px">${inner}</td></tr>
        <tr>
          <td style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:11px;color:#a8a29e">
            b2bpro.store — place de marché B2B francophone · ${SITE.url} · message automatique interne
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface MailRows {
  label: string;
  value: string;
  mono?: boolean;
}

/** Corps standard : titre, intro, tableau libellé/valeur, note de pied. */
function buildBody(params: {
  title: string;
  intro: string;
  rows: MailRows[];
  note?: string;
}): { html: string; text: string } {
  const { title, intro, rows, note } = params;
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;width:172px;font-size:12.5px;color:#78716c;vertical-align:top">${esc(r.label)}</td>
        <td style="padding:8px 0 8px 12px;font-size:13.5px;color:#1c1917;font-weight:600;${r.mono ? MONO : ""}">${esc(r.value)}</td>
      </tr>`,
    )
    .join("");

  const html = emailShell(`
    <h1 style="margin:0 0 10px;font-size:20px;color:#1c1917">${esc(title)}</h1>
    <p style="margin:0 0 18px;font-size:13.5px;line-height:21px;color:#57534e">${esc(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;margin:0 0 18px">${rowsHtml}</table>
    ${note ? `<p style="margin:0;font-size:12.5px;line-height:19px;color:#a8a29e">${esc(note)}</p>` : ""}`);

  const text = [
    title,
    "",
    intro,
    "",
    ...rows.map((r) => `${r.label} : ${r.value}`),
    ...(note ? ["", note] : []),
    "",
    `— b2bpro.store · ${SITE.url}`,
  ].join("\n");

  return { html, text };
}

// ─── Envoi réel (SMTP) ou trace console (dev) — ne lève JAMAIS ───────────────

async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  urgent?: boolean;
}): Promise<boolean> {
  const { to, subject, html, text, urgent } = params;

  if (!smtpConfigured()) {
    // Développement : trace lisible dans dev.log (aucune boîte réelle touchée).
    console.log(
      [
        "",
        `──────────────── [notification propriétaire] Mode dev : SMTP non configuré ────────────────`,
        `  Destinataire : ${to}${urgent ? "  (URGENT)" : ""}`,
        `  Objet : ${subject}`,
        text
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n"),
        `────────────────────────────────────────────────────────────────────────────`,
        "",
      ].join("\n"),
    );
    return false;
  }

  try {
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
      // Bornes : une notification ne doit jamais suspendre la réponse HTTP.
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });

    await transporter.sendMail({
      from: smtpFrom(),
      to,
      // Boîte de réception : les questions clients passent avant le reste.
      priority: urgent ? "high" : "normal",
      subject: urgent ? `[URGENT] ${subject}` : subject,
      text,
      html,
    });
    return true;
  } catch (e) {
    console.error("[notification] Échec d'envoi (action métier non affectée) :", e);
    return false;
  }
}

// ─── API publique : chaque notification garde la même forme ─────────────────

export interface OwnerNotification {
  /** Objet court et scannable (préfixé [URGENT] si demandé). */
  subject: string;
  /** Titre affiché en gros dans le corps. */
  title: string;
  /** Phrase d'introduction (1-2 lignes). */
  intro: string;
  /** Tableau libellé → valeur (identité du client, montant, références…). */
  rows: MailRows[];
  /** Note de pied discrète (action attendue, rappel de sécurité…). */
  note?: string;
  /** Question client en attente de réponse humaine ? */
  urgent?: boolean;
}

/**
 * Notifie le propriétaire-prestataire. Retourne true si l'email est parti
 * (false = SMTP absent/échec tracé) — ne lève jamais, n'altere pas l'appelant.
 */
export async function sendOwnerNotification(n: OwnerNotification): Promise<boolean> {
  const to = getOwnerEmail();
  if (!to) {
    // Ni OWNER_EMAIL ni SMTP_USER : environnement sans boîte — trace minimale.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[notification] OWNER_EMAIL/SMTP_USER absents — objet ignoré : ${n.subject}`);
    }
    return false;
  }
  const { html, text } = buildBody({
    title: n.title,
    intro: n.intro,
    rows: n.rows,
    note: n.note,
  });
  return sendMail({ to, subject: n.subject, html, text, urgent: n.urgent });
}

// ─── Notifications métier prêtes à l'emploi (les routes n'assemblent rien) ──

const eur = (n: number): string =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Une commande vient d'être créée (PayPal ou voie démo) — paiement non capturé. */
export function notifyOwnerNewOrder(params: {
  reference: string;
  serviceTitle: string;
  serviceSlug: string;
  total: number;
  deliveryDays: number;
  clientEmail: string;
  clientName: string | null;
  options: { name: string; priceExtra: number }[];
  provider: "paypal" | "demo";
}): Promise<boolean> {
  return sendOwnerNotification({
    subject: `Nouvelle commande ${params.reference} — ${eur(params.total)} — ${params.serviceTitle}`,
    title: "Nouvelle commande reçue",
    intro:
      params.provider === "paypal"
        ? "Une commande PayPal vient d'être initiée. Le paiement est approuvé par l'acheteur mais les fonds ne sont capturés qu'à la validation."
        : "Une commande vient d'être enregistrée par la voie de démonstration (aucun paiement réel).",
    rows: [
      { label: "Référence", value: params.reference, mono: true },
      { label: "Service", value: params.serviceTitle },
      { label: "Fiche", value: `/services/${params.serviceSlug}`, mono: true },
      ...(params.options.length
        ? params.options.map((o) => ({
            label: "Option choisie",
            value: `${o.name} (+${eur(o.priceExtra)})`,
          }))
        : []),
      { label: "Total", value: eur(params.total) },
      { label: "Livraison", value: `${params.deliveryDays} jours ouvrés` },
      { label: "Client", value: params.clientEmail, mono: true },
      ...(params.clientName ? [{ label: "Nom", value: params.clientName }] : []),
    ],
    note: "Suivi complet dans le panneau d'administration (commandes et journal d'audit).",
  });
}

/** Transaction décisive : les fonds d'une commande viennent d'être capturés. */
export function notifyOwnerPaymentCaptured(params: {
  reference: string;
  serviceTitle: string;
  total: number;
  payerEmail: string | null;
  payerName: string | null;
  captureId: string | null;
  clientEmail: string;
}): Promise<boolean> {
  return sendOwnerNotification({
    subject: `Paiement capturé ${params.reference} — ${eur(params.total)}`,
    title: "Fonds capturés — fonds sécurisés",
    intro:
      "Transaction décisive : le paiement est capturé et séquestré jusqu'à la livraison approuvée par le client.",
    rows: [
      { label: "Référence", value: params.reference, mono: true },
      { label: "Service", value: params.serviceTitle },
      { label: "Montant", value: eur(params.total) },
      { label: "Transaction PayPal", value: params.captureId ?? "(capture immédiate)", mono: true },
      { label: "Client (lead)", value: params.clientEmail, mono: true },
      ...(params.payerEmail ? [{ label: "Compte payeur", value: params.payerEmail, mono: true }] : []),
      ...(params.payerName ? [{ label: "Nom du payeur", value: params.payerName }] : []),
    ],
    note: "Le livrable doit être produit dans le délai promis — le client suit son compte à rebours dans son espace.",
  });
}

/** Nouvelle conversation démarrée avec l'assistant prestataire IA d'un service. */
export function notifyOwnerAiConversation(params: {
  serviceTitle: string;
  serviceSlug: string;
  question: string;
  clientEmail: string | null;
}): Promise<boolean> {
  return sendOwnerNotification({
    subject: `Conversation IA démarrée — ${params.serviceTitle}`,
    title: "Nouvelle conversation avec l'assistant IA",
    intro:
      "Un visiteur vient de poser sa première question à l'assistant IA du service ci-dessous — signe d'intérêt avant commande.",
    rows: [
      { label: "Service", value: params.serviceTitle },
      { label: "Fiche", value: `/services/${params.serviceSlug}`, mono: true },
      { label: "Question", value: params.question },
      ...(params.clientEmail ? [{ label: "Visiteur identifié", value: params.clientEmail, mono: true }] : []),
    ],
    note: "Les réponses de l'assistant restent fidèles à la fiche — aucune action requise sauf relance humaine demandée.",
  });
}

/** Question client adressée AU support humain — notification URGENTE (v2.5.0).
 * Chaque question porte sa route unique (questionRef) : l'email de alerte
 * embarque le code ET le lien direct vers CE fil dans le panneau — la
 * réponse ne peut partir que vers ce client précis. */
export function notifyOwnerClientQuestion(params: {
  clientEmail: string;
  clientName: string | null;
  message: string;
  ordersCount: number;
  /** Code de route unique de la question (Q-XXXXXX). */
  questionRef: string;
  /** Id du fil : lien direct vers la conversation dans le panneau. */
  threadId: string;
}): Promise<boolean> {
  return sendOwnerNotification({
    urgent: true,
    subject: `Question ${params.questionRef} en attente — ${params.clientEmail}`,
    title: "Question client à traiter",
    intro:
      "Un client vous écrit depuis son espace. Sa question porte une route unique : votre réponse lui sera transmise à LUI seul (email filaire + espace client).",
    rows: [
      { label: "Route de la question", value: params.questionRef, mono: true },
      { label: "Client", value: params.clientEmail, mono: true },
      ...(params.clientName ? [{ label: "Nom", value: params.clientName }] : []),
      { label: "Historique commandes", value: `${params.ordersCount}` },
      { label: "Message", value: params.message },
      { label: "Répondre (panneau)", value: `/admin/messages?thread=${params.threadId}`, mono: true },
    ],
    note: `Un clic sur le lien ouvre directement le fil de CE client dans le panneau → Messages clients. Répondez-y : le client ${params.clientEmail} reçoit la réponse par email avec la référence ${params.questionRef} — aucun autre client ne peut la recevoir.`,
  });
}

/** Réponse du support transmise au client (email + espace client) — v2.5.0 :
 * l'objet référence la ROUTE de la question (Q-XXXXXX) → fil de discussion
 * email propre par question ; le client X ne reçoit jamais la réponse du Y.
 * Aucune adresse email n'est exposée au client (expéditeur = identité du site). */
export async function sendClientOwnerReply(params: {
  to: string;
  clientName: string | null;
  reply: string;
  /** Code de la question à laquelle on répond (facultatif — repli propre). */
  questionRef?: string | null;
  /** Extrait de la question d'origine, rappelé au-dessus de la réponse. */
  questionExcerpt?: string | null;
}): Promise<boolean> {
  const ref = params.questionRef ?? null;
  const { html, text } = buildBody({
    title: ref ? `Réponse à votre question ${ref}` : "Réponse du support b2bpro.store",
    intro: `Bonjour ${params.clientName?.split(" ")[0] ?? ""}, voici la réponse du support à votre question. La suite de l'échange reste disponible dans votre espace client.`,
    rows: [
      ...(params.questionExcerpt
        ? [{ label: "Votre question", value: params.questionExcerpt }]
        : []),
      { label: "Réponse", value: params.reply },
    ],
    note: "Retrouvez l'historique complet et répondez directement depuis votre espace : /account (rubrique « Contacter le support humain »).",
  });
  return sendMail({
    to: params.to,
    subject: ref
      ? `Réponse à votre question ${ref} — b2bpro.store`
      : "Réponse du support — b2bpro.store",
    html,
    text,
  });
}

// ─── Cycle de vie des commandes (v2.5.0) ────────────────────────────────────

/** Le client a demandé une modification sur un travail en cours — URGENT. */
export function notifyOwnerRevisionRequested(params: {
  reference: string;
  serviceTitle: string;
  reason: string;
  clientEmail: string;
  revisionCount: number;
}): Promise<boolean> {
  return sendOwnerNotification({
    urgent: true,
    subject: `Modification demandée ${params.reference} — ${params.serviceTitle}`,
    title: "Modification demandée par le client",
    intro:
      "Le client demande un ajustement sur une commande en cours. Le compte à rebours client affiche désormais « modification en traitement ».",
    rows: [
      { label: "Commande", value: params.reference, mono: true },
      { label: "Service", value: params.serviceTitle },
      { label: "N° de demande", value: `${params.revisionCount}` },
      { label: "Motif du client", value: params.reason },
      { label: "Client", value: params.clientEmail, mono: true },
    ],
    note: "Traitez la modification puis marquez la commande « livrée » depuis le panneau → Commandes : le client reçoit un email de validation.",
  });
}

/** Le support a marqué une commande livrée — email au client. */
export async function sendClientOrderDelivered(params: {
  to: string;
  clientName: string | null;
  reference: string;
  serviceTitle: string;
  total: number;
}): Promise<boolean> {
  const eur = (n: number): string =>
    `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const { html, text } = buildBody({
    title: `Votre livrable est prêt — ${params.reference}`,
    intro: `Bonjour ${params.clientName?.split(" ")[0] ?? ""}, le travail commandé est terminé. Un dernier geste débloque le paiement du prestataire : validez la livraison dans votre espace.`,
    rows: [
      { label: "Commande", value: params.reference, mono: true },
      { label: "Service", value: params.serviceTitle },
      { label: "Montant séquestré", value: eur(params.total) },
    ],
    note: "Validez depuis votre espace : /account → « Valider la livraison ». Les fonds sont alors versés au prestataire ; en cas de défaut, une demande de modification reste possible avant validation.",
  });
  return sendMail({
    to: params.to,
    subject: `Livrable prêt à valider — ${params.reference} — b2bpro.store`,
    html,
    text,
  });
}

/** Le client a validé la livraison : fonds libérés au prestataire. */
export function notifyOwnerOrderValidated(params: {
  reference: string;
  serviceTitle: string;
  total: number;
  clientEmail: string;
  deliveredAt: Date | null;
}): Promise<boolean> {
  const eur = (n: number): string =>
    `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  return sendOwnerNotification({
    subject: `Commande validée ${params.reference} — ${eur(params.total)} à libérer`,
    title: "Validation client — paiement du prestataire à effectuer",
    intro:
      "Le client a validé la livraison : les fonds séquestrés doivent être versés au prestataire (transaction de sortie à opérer côté PayPal).",
    rows: [
      { label: "Commande", value: params.reference, mono: true },
      { label: "Service", value: params.serviceTitle },
      { label: "Montant libéré", value: eur(params.total) },
      { label: "Client", value: params.clientEmail, mono: true },
      { label: "Livrée le", value: params.deliveredAt ? params.deliveredAt.toISOString().slice(0, 10) : "—" },
    ],
    note: "Le client peut désormais laisser un avis public sur la fiche du service — un avis lié à cette commande (un seul possible).",
  });
}
