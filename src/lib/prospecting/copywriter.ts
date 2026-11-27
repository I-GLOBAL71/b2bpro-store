/**
 * Rédaction chirurgicale des e-mails de prospection B2B (IA DeepSeek + repli déterministe).
 * Zéro tiret cadratin, phrases courtes, preuves techniques mesurées, deux CTA explicites
 * (/services/[slug] + /support) et lien de désinscription 1-clic.
 */

import { getSiteUrl } from "@/lib/env";
import {
  buildUnsubscribeUrl,
  sanitizeNoEmDash,
  type ProspectAuditFinding,
  type ProspectingConfig,
} from "@/lib/prospecting/types";

export interface CopywriterInput {
  companyName: string;
  city: string;
  domain: string;
  email: string;
  poleSlug: string;
  serviceSlug: string;
  serviceTitle: string;
  servicePrice: number;
  deliveryDays: number;
  findings: ProspectAuditFinding;
  config: ProspectingConfig;
  isFollowup?: boolean;
  siteUrl?: string;
  useAi?: boolean;
}

export interface GeneratedEmailCopy {
  subject: string;
  textBody: string;
  htmlBody: string;
  usedAi: boolean;
}

const BANNED_AI_WORDS_RE =
  /\b(dans un monde|crucial|primordial|incontournable|propulser|synergie|r[ée]volutionner|optimiser votre pr[ée]sence|levier incontournable)\b/i;

export function buildServiceCtaUrl(
  serviceSlug: string,
  poleSlug: string,
  siteUrl?: string,
): string {
  const base = (siteUrl || getSiteUrl()).replace(/\/+$/, "");
  return `${base}/services/${serviceSlug}?utm_source=email_b2b&utm_medium=outreach&utm_campaign=${encodeURIComponent(poleSlug)}`;
}

export function buildSupportCtaUrl(poleSlug: string, siteUrl?: string): string {
  const base = (siteUrl || getSiteUrl()).replace(/\/+$/, "");
  return `${base}/support?utm_source=email_b2b&utm_campaign=${encodeURIComponent(poleSlug)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSignatureText(config: ProspectingConfig): string {
  return [
    config.senderFullName,
    `${config.senderRole}, b2bpro.store`,
    config.senderCity,
  ].join("\n");
}

function renderProspectEmailHtml(params: {
  paragraphs: string[];
  companyName: string;
  domain: string;
  findings: ProspectAuditFinding;
  serviceTitle: string;
  servicePrice: number;
  deliveryDays: number;
  serviceUrl: string;
  supportUrl: string;
  unsubscribeUrl: string;
  config: ProspectingConfig;
  siteBase: string;
}): string {
  const bodyHtml = params.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1c1917">${escapeHtml(p)}</p>`,
    )
    .join("");

  const issueItems = params.findings.issues
    .slice(0, 3)
    .map(
      (issue) =>
        `<li style="margin:0 0 6px;font-size:13.5px;line-height:1.5;color:#292524">${escapeHtml(sanitizeNoEmDash(issue))}</li>`,
    )
    .join("");

  const cleanServiceTitle = sanitizeNoEmDash(params.serviceTitle);
  const daysLabel = `${params.deliveryDays} jour${params.deliveryDays > 1 ? "s" : ""} ouvré${params.deliveryDays > 1 ? "s" : ""}`;

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:580px;background:#ffffff;border-radius:14px;border:1px solid #e7e5e4;overflow:hidden">
        <tr>
          <td style="padding:28px 28px 18px">
            ${bodyHtml}
            ${
              issueItems
                ? `<div style="margin:18px 0;padding:14px 16px;background:#fafaf9;border-left:3px solid #059669;border-radius:6px">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#059669">Points relevés sur ${escapeHtml(params.domain)}</p>
                    <ul style="margin:0;padding-left:18px">${issueItems}</ul>
                  </div>`
                : ""
            }
            <div style="margin:22px 0 8px;padding:16px;border:1px solid #d6d3d1;border-radius:10px;background:#ffffff">
              <p style="margin:0 0 4px;font-size:12px;color:#57534e">Solution recommandée pour ${escapeHtml(params.companyName)}</p>
              <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1c1917">${escapeHtml(cleanServiceTitle)} (${params.servicePrice} €, livraison ${escapeHtml(daysLabel)})</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px">
                    <a href="${escapeHtml(params.serviceUrl)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:8px">Voir le livrable clé en main (${params.servicePrice} €)</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="${escapeHtml(params.supportUrl)}" style="display:inline-block;background:#f5f5f4;color:#1c1917;border:1px solid #d6d3d1;text-decoration:none;font-size:13.5px;font-weight:600;padding:10px 18px;border-radius:8px">Poser une question au support b2bpro.store</a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:12px;color:#57534e">Paiement sécurisé sous séquestre : le prestataire n'est payé qu'après validation de votre livrable.</p>
            </div>
            <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#1c1917">
              <strong>${escapeHtml(params.config.senderFullName)}</strong><br/>
              <span style="color:#57534e">${escapeHtml(params.config.senderRole)}, b2bpro.store</span><br/>
              <span style="color:#57534e">${escapeHtml(params.config.senderCity)}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:11.5px;line-height:1.5;color:#78716c">
            Message professionnel envoyé à une adresse publique de ${escapeHtml(params.domain)} depuis ${escapeHtml(params.siteBase)}.<br/>
            Vous ne souhaitez plus recevoir nos notes d'audit ? <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#059669;text-decoration:underline">Se désinscrire immédiatement en 1 clic</a>.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildDeterministicProspectCopy(input: CopywriterInput): GeneratedEmailCopy {
  const siteBase = (input.siteUrl || getSiteUrl()).replace(/\/+$/, "");
  const serviceUrl = buildServiceCtaUrl(input.serviceSlug, input.poleSlug, siteBase);
  const supportUrl = buildSupportCtaUrl(input.poleSlug, siteBase);
  const unsubscribeUrl = buildUnsubscribeUrl(input.email, siteBase);
  const daysLabel = `${input.deliveryDays} jour${input.deliveryDays > 1 ? "s" : ""} ouvré${input.deliveryDays > 1 ? "s" : ""}`;
  const mainIssue = sanitizeNoEmDash(
    input.findings.issues[0] || "des marges de progression rapides sur la visibilité IA",
  );
  const secondIssue = sanitizeNoEmDash(
    input.findings.issues[1] || "la structuration des signaux lus par Google et ChatGPT",
  );

  let subject: string;
  let paragraphs: string[];

  if (input.isFollowup) {
    subject = sanitizeNoEmDash(`Suite de ma note sur ${input.domain} (${input.companyName})`);
    paragraphs = [
      `Bonjour,`,
      `Je vous avais partagé il y a quelques jours deux points techniques relevés sur ${input.domain} (${mainIssue.toLowerCase()}).`,
      `Si ce sujet n'est pas prioritaire pour ${input.companyName} ce mois-ci, aucun problème. Si vous souhaitez un livrable concret prêt à exploiter en ${daysLabel} dès ${input.servicePrice} €, la fiche détaillée reste accessible ci-dessous, avec paiement sous séquestre après validation.`,
      `Vous pouvez aussi échanger directement avec notre équipe en un clic sur le support de b2bpro.store si vous avez une question précise.`,
    ];
  } else {
    subject = sanitizeNoEmDash(
      `${input.companyName} : 2 points techniques relevés sur ${input.domain}`,
    );
    paragraphs = [
      `Bonjour l'équipe ${input.companyName},`,
      `En préparant notre veille sectorielle sur ${input.city}, j'ai analysé la page publique de ${input.domain}. Votre site est actif, mais deux points freinent aujourd'hui votre acquisition sur Google et les moteurs IA : ${mainIssue.toLowerCase()}, et ${secondIssue.toLowerCase()}.`,
      `Sur b2bpro.store, nos spécialistes francophones livrent un plan d'action exploitable en ${daysLabel} dès ${input.servicePrice} € via la prestation « ${sanitizeNoEmDash(input.serviceTitle)} ». Le règlement reste protégé sous séquestre jusqu'à votre validation du livrable.`,
      `Souhaitez-vous consulter le détail ou poser une question rapide à notre support avant de commander ?`,
    ];
  }

  const cleanParagraphs = paragraphs.map((p) => sanitizeNoEmDash(p));
  const textBody = sanitizeNoEmDash(
    [
      ...cleanParagraphs,
      "",
      `Voir la fiche service (${input.servicePrice} €) : ${serviceUrl}`,
      `Contacter directement le support b2bpro.store : ${supportUrl}`,
      "",
      formatSignatureText(input.config),
      "",
      `Se désinscrire en 1 clic : ${unsubscribeUrl}`,
    ].join("\n"),
  );

  const htmlBody = renderProspectEmailHtml({
    paragraphs: cleanParagraphs,
    companyName: input.companyName,
    domain: input.domain,
    findings: input.findings,
    serviceTitle: input.serviceTitle,
    servicePrice: input.servicePrice,
    deliveryDays: input.deliveryDays,
    serviceUrl,
    supportUrl,
    unsubscribeUrl,
    config: input.config,
    siteBase,
  });

  return {
    subject,
    textBody,
    htmlBody,
    usedAi: false,
  };
}

export async function generateProspectCopy(input: CopywriterInput): Promise<GeneratedEmailCopy> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey || input.useAi === false) {
    return buildDeterministicProspectCopy(input);
  }

  const siteBase = (input.siteUrl || getSiteUrl()).replace(/\/+$/, "");
  const serviceUrl = buildServiceCtaUrl(input.serviceSlug, input.poleSlug, siteBase);
  const supportUrl = buildSupportCtaUrl(input.poleSlug, siteBase);
  const unsubscribeUrl = buildUnsubscribeUrl(input.email, siteBase);
  const daysLabel = `${input.deliveryDays} jour${input.deliveryDays > 1 ? "s" : ""} ouvré${input.deliveryDays > 1 ? "s" : ""}`;

  const prompt = [
    `Rédige un email B2B francophone court et sobre (95 à 130 mots) pour ${input.companyName} (${input.city}, site ${input.domain}).`,
    `Type : ${input.isFollowup ? "relance polie 3 jours après un premier envoi, sans insistance" : "premier contact basé sur un audit technique réel"}.`,
    `Constats mesurés sur le site : ${input.findings.issues.slice(0, 3).join(" | ")}.`,
    `Prestation adaptée sur b2bpro.store : "${input.serviceTitle}" à ${input.servicePrice} €, livraison en ${daysLabel}, paiement séquestré jusqu'à validation.`,
    `Expéditeur : ${input.config.senderFullName} (${input.config.senderCity}).`,
    `Règles impératives :`,
    `- Zéro tiret cadratin, zéro émoticône, zéro formule marketing creuse.`,
    `- Vouvoiement naturel et factuel.`,
    `- N'invente aucun chiffre absent ci-dessus et n'inclus pas d'URL dans le texte (les boutons s'en chargent).`,
    `- Termine en proposant de voir la fiche service ou de contacter notre support.`,
    `Réponds STRICTEMENT en JSON valide : {"subject":"...","paragraphs":["Bonjour ...,","...","..."]}`,
  ].join("\n");

  try {
    const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Tu es un consultant B2B senior à Lyon. Tu écris des emails courts, précis, humains et sans jargon IA.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 340,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return buildDeterministicProspectCopy(input);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return buildDeterministicProspectCopy(input);

    const parsed = JSON.parse(jsonMatch[0]) as {
      subject?: unknown;
      paragraphs?: unknown;
    };

    if (
      typeof parsed.subject !== "string" ||
      !Array.isArray(parsed.paragraphs) ||
      parsed.paragraphs.length < 2
    ) {
      return buildDeterministicProspectCopy(input);
    }

    const subject = sanitizeNoEmDash(parsed.subject).trim().slice(0, 110);
    const cleanParagraphs = parsed.paragraphs
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((p) => sanitizeNoEmDash(p).trim())
      .slice(0, 5);

    const joined = `${subject} ${cleanParagraphs.join(" ")}`;
    const wordCount = cleanParagraphs.join(" ").split(/\s+/).filter(Boolean).length;
    if (
      subject.length < 10 ||
      wordCount < 45 ||
      wordCount > 190 ||
      BANNED_AI_WORDS_RE.test(joined)
    ) {
      return buildDeterministicProspectCopy(input);
    }

    const textBody = sanitizeNoEmDash(
      [
        ...cleanParagraphs,
        "",
        `Voir la fiche service (${input.servicePrice} €) : ${serviceUrl}`,
        `Contacter directement le support b2bpro.store : ${supportUrl}`,
        "",
        formatSignatureText(input.config),
        "",
        `Se désinscrire en 1 clic : ${unsubscribeUrl}`,
      ].join("\n"),
    );

    const htmlBody = renderProspectEmailHtml({
      paragraphs: cleanParagraphs,
      companyName: input.companyName,
      domain: input.domain,
      findings: input.findings,
      serviceTitle: input.serviceTitle,
      servicePrice: input.servicePrice,
      deliveryDays: input.deliveryDays,
      serviceUrl,
      supportUrl,
      unsubscribeUrl,
      config: input.config,
      siteBase,
    });

    return { subject, textBody, htmlBody, usedAi: true };
  } catch {
    return buildDeterministicProspectCopy(input);
  }
}
