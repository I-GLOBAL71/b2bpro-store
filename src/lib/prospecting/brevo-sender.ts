/**
 * Transport d'e-mails de prospection B2B 1-à-1 dédié (SMTP direct / Gmail App Password).
 *
 * Règle stricte anti-spam : Brevo est réservé EXCLUSIVEMENT aux e-mails
 * transactionnels et opt-in du site (src/lib/mailer.ts). Aucune prospection à
 * froid n'est envoyée via Brevo ou Resend afin de protéger la réputation du compte.
 */

import nodemailer from "nodemailer";
import type { WaveRunSummary } from "@/lib/prospecting/types";

const BREVO_API_BASE = "https://api.brevo.com/v3";

export interface BrevoAccountStatus {
  configured: boolean;
  ok: boolean;
  provider?: "smtp" | "none";
  creditsRemaining: number;
  senderEmail: string;
  senderName: string;
  error?: string;
}

export interface BrevoSendParams {
  toEmail: string;
  toName: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  unsubscribeUrl: string;
  tags?: string[];
}

export type BrevoSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; hardBounce?: boolean; accountPaused?: boolean };

interface OutreachSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
}

const PAUSE_MESSAGE =
  "Prospection e-mail en pause : Brevo est réservé aux e-mails transactionnels du site. Ajoutez GMAIL_SMTP_USER + GMAIL_SMTP_PASSWORD (mot de passe d'application 16 lettres) dans .env pour activer les envois 1-à-1.";

function brevoApiKey(): string | undefined {
  const key = process.env.BREVO_API_KEY?.trim();
  return key ? key : undefined;
}

function resolveOutreachSmtp(): OutreachSmtpConfig | null {
  const gmailUser = process.env.GMAIL_SMTP_USER?.trim();
  const gmailPass = process.env.GMAIL_SMTP_PASSWORD?.trim();
  if (gmailUser && gmailPass) {
    return {
      host: "smtp.gmail.com",
      port: 587,
      user: gmailUser,
      pass: gmailPass.replace(/\s+/g, ""),
      fromEmail: gmailUser,
    };
  }

  const outHost = process.env.OUTREACH_SMTP_HOST?.trim();
  const outUser = process.env.OUTREACH_SMTP_USER?.trim();
  const outPass = process.env.OUTREACH_SMTP_PASSWORD?.trim();
  if (
    outHost &&
    !/brevo\.com|sendinblue\.com|resend\.com/i.test(outHost) &&
    outUser &&
    outPass
  ) {
    const portNum = Number(process.env.OUTREACH_SMTP_PORT || "587");
    return {
      host: outHost,
      port: Number.isFinite(portNum) ? portNum : 587,
      user: outUser,
      pass: outPass,
      fromEmail: process.env.OUTREACH_FROM_EMAIL?.trim() || outUser,
    };
  }

  return null;
}

export async function getBrevoAccountStatus(): Promise<BrevoAccountStatus> {
  const fallbackEmail =
    process.env.OWNER_EMAIL?.trim() || "fabricewilliam71@gmail.com";
  const fallbackName =
    process.env.PROSPECTING_SENDER_DISPLAY?.trim() || "b2bpro.store";

  const smtp = resolveOutreachSmtp();
  if (!smtp) {
    return {
      configured: false,
      ok: false,
      provider: "none",
      creditsRemaining: 0,
      senderEmail: fallbackEmail,
      senderName: fallbackName,
      error: PAUSE_MESSAGE,
    };
  }

  return {
    configured: true,
    ok: true,
    provider: "smtp",
    creditsRemaining: 15,
    senderEmail: smtp.fromEmail,
    senderName: fallbackName,
  };
}

export async function getBrevoBlockedEmails(): Promise<Set<string>> {
  const apiKey = brevoApiKey();
  const blocked = new Set<string>();
  if (!apiKey) return blocked;

  try {
    const res = await fetch(`${BREVO_API_BASE}/smtp/blockedContacts?limit=100`, {
      headers: { "api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return blocked;
    const data = (await res.json()) as {
      contacts?: Array<{ email?: string }>;
    };
    for (const c of data.contacts ?? []) {
      if (c.email) blocked.add(c.email.trim().toLowerCase());
    }
  } catch {
    // Tolérant : l'opt-out interne reste la référence prioritaire
  }
  return blocked;
}

export async function addBrevoBlockedContact(email: string): Promise<void> {
  const apiKey = brevoApiKey();
  if (!apiKey) return;
  try {
    await fetch(`${BREVO_API_BASE}/contacts`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        emailBlacklisted: true,
        updateEnabled: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non bloquant
  }
}

export async function sendBrevoProspectEmail(
  params: BrevoSendParams,
): Promise<BrevoSendResult> {
  const cfg = resolveOutreachSmtp();
  if (!cfg) {
    return {
      ok: false,
      accountPaused: true,
      error: PAUSE_MESSAGE,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 12_000,
      socketTimeout: 15_000,
    });
    const displayFrom =
      process.env.PROSPECTING_SENDER_DISPLAY?.trim() || "b2bpro.store";
    const info = await transporter.sendMail({
      from: `${displayFrom} <${cfg.fromEmail}>`,
      replyTo: `${displayFrom} <${params.replyToEmail || cfg.fromEmail}>`,
      to: `${params.toName} <${params.toEmail}>`,
      subject: params.subject,
      html: params.htmlContent,
      text: params.textContent,
      headers: {
        "List-Unsubscribe": `<${params.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    return { ok: true, messageId: info.messageId || "smtp-ok" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hardBounce = /550|553|recipient|invalid|no such user/i.test(msg);
    const accountPaused = /auth|535|534|daily user sending quota|suspended/i.test(msg);
    return {
      ok: false,
      error: `SMTP: ${msg.slice(0, 180)}`,
      hardBounce,
      accountPaused,
    };
  }
}

export async function sendOwnerWaveSummaryEmail(
  summary: WaveRunSummary,
  senderEmail: string,
): Promise<boolean> {
  const cfg = resolveOutreachSmtp();
  const ownerEmail = process.env.OWNER_EMAIL?.trim() || senderEmail;
  if (!cfg || !ownerEmail || summary.dryRun) {
    return false;
  }
  if (
    summary.initialSent === 0 &&
    summary.followupsSent === 0 &&
    !summary.devtoPublished
  ) {
    return false;
  }

  const lines = [
    `Rapport prospection autonome b2bpro.store (vague : ${summary.wave})`,
    `Nouvelles entreprises auditées : ${summary.newAudited}`,
    `Premiers emails B2B envoyés : ${summary.initialSent}`,
    `Relances J+3 envoyées : ${summary.followupsSent}`,
    `Total emails aujourd'hui : ${summary.emailsSentToday} / ${summary.dailyEmailCap}`,
    `Publication Dev.to : ${summary.devtoPublished ? summary.devtoPublished.externalUrl : "Aucune sur cette vague"}`,
  ];
  if (summary.errors.length > 0) {
    lines.push(`Avertissements (${summary.errors.length}) : ${summary.errors.slice(0, 3).join(" ; ")}`);
  }

  const htmlRows = lines
    .map((l) => `<li style="margin:0 0 6px;font-size:14px;color:#1c1917">${l}</li>`)
    .join("");

  const html = `<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif;background:#f5f5f4;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:24px"><h2 style="margin:0 0 12px;color:#059669">Rapport Prospection b2bpro.store</h2><ul style="padding-left:18px;margin:0 0 16px">${htmlRows}</ul><p style="margin:0;font-size:13px"><a href="https://b2bpro.store/admin/prospection" style="color:#059669;font-weight:700">Ouvrir le suivi dans /admin/prospection</a></p></div></body></html>`;

  const res = await sendBrevoProspectEmail({
    toEmail: ownerEmail,
    toName: "Propriétaire b2bpro.store",
    senderEmail: cfg.fromEmail,
    senderName: "Système b2bpro.store",
    replyToEmail: ownerEmail,
    subject: `[b2bpro] Vague ${summary.wave} : ${summary.initialSent + summary.followupsSent} email(s) envoyé(s)`,
    htmlContent: html,
    textContent: lines.join("\n"),
    unsubscribeUrl: "https://b2bpro.store/admin/prospection",
    tags: ["b2bpro-owner-report"],
  });

  return res.ok;
}
