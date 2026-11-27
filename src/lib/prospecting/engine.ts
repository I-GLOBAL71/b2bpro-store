/**
 * Orchestrateur central de prospection B2B 100 % autonome (b2bpro.store).
 * Respecte strictement le plafond journalier, les désinscriptions RGPD,
 * la relance unique à J+3 et la syndication Dev.to.
 */

import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/env";
import {
  getBrevoAccountStatus,
  getBrevoBlockedEmails,
  sendBrevoProspectEmail,
  sendOwnerWaveSummaryEmail,
} from "@/lib/prospecting/brevo-sender";
import { generateProspectCopy } from "@/lib/prospecting/copywriter";
import {
  generateDailySocialKit,
  publishNextBlogToDevto,
} from "@/lib/prospecting/social-publisher";
import { discoverAndAuditProspects } from "@/lib/prospecting/sourcer";
import {
  appendHistoryJsonl,
  countEmailsSentToday,
  getOptoutList,
  getProspectLedger,
  getProspectingConfig,
  getSocialState,
  saveProspectLedger,
  saveProspectingConfig,
  saveSocialState,
} from "@/lib/prospecting/store";
import {
  buildUnsubscribeUrl,
  normalizeEmail,
  type ProspectRecord,
  type WaveRunSummary,
} from "@/lib/prospecting/types";
import { logAdminAction } from "@/lib/settings";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RunWaveOptions {
  wave?: string;
  emailLimit?: number;
  dryRun?: boolean;
  skipSocial?: boolean;
}

export async function runAutonomousProspectingWave(
  opts: RunWaveOptions = {},
): Promise<WaveRunSummary> {
  const startedAt = new Date().toISOString();
  const wave = opts.wave || "auto";
  const dryRun = Boolean(opts.dryRun);
  const requestedLimit = Math.max(1, Math.min(50, opts.emailLimit ?? 10));

  const [config, ledger, socialState] = await Promise.all([
    getProspectingConfig(),
    getProspectLedger(),
    getSocialState(),
  ]);
  const optouts = await getOptoutList();
  const brevoStatus = await getBrevoAccountStatus();
  const brevoBlocked = await getBrevoBlockedEmails();

  const excludedEmails = new Set<string>(optouts.map(normalizeEmail));
  for (const b of brevoBlocked) excludedEmails.add(normalizeEmail(b));
  for (const row of ledger) excludedEmails.add(normalizeEmail(row.email));

  const excludedDomains = new Set<string>(ledger.map((r) => r.domain.toLowerCase()));
  const optoutSet = new Set<string>(optouts.map(normalizeEmail));
  for (const b of brevoBlocked) optoutSet.add(normalizeEmail(b));

  const sentTodayAlready = countEmailsSentToday(ledger);
  const remainingCap = config.enabled
    ? Math.max(0, config.dailyEmailCap - sentTodayAlready)
    : 0;
  const maxEmailsThisWave = dryRun
    ? requestedLimit
    : Math.min(requestedLimit, remainingCap, Math.max(0, brevoStatus.creditsRemaining || 300));

  const errors: string[] = [];
  if (!config.enabled && !dryRun) {
    errors.push("Moteur en pause dans les réglages (/admin/prospection).");
  }
  if (!dryRun && !brevoStatus.ok) {
    errors.push(brevoStatus.error || "Compte Brevo indisponible.");
  }

  let initialSent = 0;
  let followupsSent = 0;
  let newAudited = 0;
  const previewSamples: WaveRunSummary["previewSamples"] = [];
  const mutableLedger = [...ledger];
  const siteUrl = getSiteUrl();

  // ── 1. Relances uniques J+3 (prioritaires) ─────────────────────────────────
  const cutoffMs = Date.now() - config.followupDelayDays * 86_400_000;
  let budgetLeft = maxEmailsThisWave;
  let relayPaused = false;

  if ((dryRun || (brevoStatus.ok && config.enabled)) && budgetLeft > 0) {
    const dueFollowups = mutableLedger.filter(
      (r) =>
        r.status === "emailed" &&
        !r.followedUpAt &&
        r.emailedAt &&
        new Date(r.emailedAt).getTime() <= cutoffMs &&
        !optoutSet.has(normalizeEmail(r.email)),
    );

    for (const prospect of dueFollowups) {
      if (budgetLeft <= 0 || relayPaused) break;

      const copy = await generateProspectCopy({
        companyName: prospect.companyName,
        city: prospect.city,
        domain: prospect.domain,
        email: prospect.email,
        poleSlug: prospect.poleSlug,
        serviceSlug: prospect.serviceSlug,
        serviceTitle: prospect.serviceTitle,
        servicePrice: prospect.servicePrice,
        deliveryDays: 2,
        findings: prospect.findings,
        config,
        isFollowup: true,
        siteUrl,
      });

      if (dryRun) {
        followupsSent += 1;
        budgetLeft -= 1;
        if (previewSamples.length < 3) {
          previewSamples.push({
            companyName: prospect.companyName,
            email: prospect.email,
            domain: prospect.domain,
            serviceSlug: prospect.serviceSlug,
            subject: copy.subject,
            textBody: copy.textBody,
            issues: prospect.findings.issues,
          });
        }
        continue;
      }

      const sendRes = await sendBrevoProspectEmail({
        toEmail: prospect.email,
        toName: prospect.companyName,
        senderEmail: brevoStatus.senderEmail,
        senderName: config.senderFullName,
        replyToEmail: brevoStatus.senderEmail,
        subject: copy.subject,
        htmlContent: copy.htmlBody,
        textContent: copy.textBody,
        unsubscribeUrl: buildUnsubscribeUrl(prospect.email, siteUrl),
        tags: ["b2bpro-followup", prospect.poleSlug],
      });

      if (sendRes.ok) {
        followupsSent += 1;
        budgetLeft -= 1;
        prospect.status = "followed_up";
        prospect.followedUpAt = new Date().toISOString();
        prospect.lastSubject = copy.subject;
        prospect.brevoMessageId = sendRes.messageId;
        prospect.updatedAt = new Date().toISOString();
        appendHistoryJsonl({
          event: "followup_sent",
          wave,
          email: prospect.email,
          domain: prospect.domain,
          serviceSlug: prospect.serviceSlug,
          messageId: sendRes.messageId,
        });
      } else if (sendRes.accountPaused) {
        relayPaused = true;
        errors.push(`Relais e-mail en attente d'activation (${prospect.email}) : ${sendRes.error}`);
        break;
      } else {
        prospect.status = sendRes.hardBounce ? "bounced" : "error";
        prospect.error = sendRes.error;
        prospect.updatedAt = new Date().toISOString();
        errors.push(`Relance ${prospect.email}: ${sendRes.error}`);
      }

      await sleep(750);
    }
  }

  // ── 1b. Prospects déjà audités en file d'attente (statut "audited") ───────
  if (!relayPaused && budgetLeft > 0 && !dryRun && brevoStatus.ok && config.enabled) {
    const queuedAudited = mutableLedger.filter(
      (r) => r.status === "audited" && !optoutSet.has(normalizeEmail(r.email)),
    );

    for (const prospect of queuedAudited) {
      if (budgetLeft <= 0 || relayPaused) break;

      const copy = await generateProspectCopy({
        companyName: prospect.companyName,
        city: prospect.city,
        domain: prospect.domain,
        email: prospect.email,
        poleSlug: prospect.poleSlug,
        serviceSlug: prospect.serviceSlug,
        serviceTitle: prospect.serviceTitle,
        servicePrice: prospect.servicePrice,
        deliveryDays: 2,
        findings: prospect.findings,
        config,
        isFollowup: false,
        siteUrl,
      });

      const sendRes = await sendBrevoProspectEmail({
        toEmail: prospect.email,
        toName: prospect.companyName,
        senderEmail: brevoStatus.senderEmail,
        senderName: config.senderFullName,
        replyToEmail: brevoStatus.senderEmail,
        subject: copy.subject,
        htmlContent: copy.htmlBody,
        textContent: copy.textBody,
        unsubscribeUrl: buildUnsubscribeUrl(prospect.email, siteUrl),
        tags: ["b2bpro-initial", prospect.poleSlug],
      });

      if (sendRes.ok) {
        const nowIso = new Date().toISOString();
        initialSent += 1;
        budgetLeft -= 1;
        prospect.status = "emailed";
        prospect.emailedAt = nowIso;
        prospect.lastSubject = copy.subject;
        prospect.brevoMessageId = sendRes.messageId;
        prospect.error = undefined;
        prospect.updatedAt = nowIso;
        appendHistoryJsonl({
          event: "initial_sent",
          wave,
          email: prospect.email,
          domain: prospect.domain,
          companyName: prospect.companyName,
          serviceSlug: prospect.serviceSlug,
          messageId: sendRes.messageId,
          usedAi: copy.usedAi,
        });
      } else if (sendRes.accountPaused) {
        relayPaused = true;
        errors.push(`Relais e-mail en attente d'activation (${prospect.email}) : ${sendRes.error}`);
        break;
      } else {
        prospect.status = sendRes.hardBounce ? "bounced" : "error";
        prospect.error = sendRes.error;
        prospect.updatedAt = new Date().toISOString();
        errors.push(`Envoi ${prospect.email}: ${sendRes.error}`);
      }

      await sleep(800);
    }
  }

  // ── 2. Découverte, audit en direct & premier contact B2B ──────────────────
  let nextCursor = config.searchCursor;
  if (!relayPaused && budgetLeft > 0 && (dryRun || (brevoStatus.ok && config.enabled))) {
    const discovery = await discoverAndAuditProspects({
      needed: budgetLeft,
      searchCursor: config.searchCursor,
      excludedEmails,
      excludedDomains,
      maxApiSteps: 6,
    });
    nextCursor = discovery.nextCursor;
    errors.push(...discovery.apiErrors);
    newAudited = discovery.prospects.length;

    for (const candidate of discovery.prospects) {
      if (budgetLeft <= 0 || relayPaused) break;

      const copy = await generateProspectCopy({
        companyName: candidate.companyName,
        city: candidate.city,
        domain: candidate.domain,
        email: candidate.email,
        poleSlug: candidate.poleSlug,
        serviceSlug: candidate.serviceSlug,
        serviceTitle: candidate.serviceTitle,
        servicePrice: candidate.servicePrice,
        deliveryDays: candidate.deliveryDays,
        findings: candidate.findings,
        config,
        isFollowup: false,
        siteUrl,
      });

      if (dryRun) {
        initialSent += 1;
        budgetLeft -= 1;
        if (previewSamples.length < 4) {
          previewSamples.push({
            companyName: candidate.companyName,
            email: candidate.email,
            domain: candidate.domain,
            serviceSlug: candidate.serviceSlug,
            subject: copy.subject,
            textBody: copy.textBody,
            issues: candidate.findings.issues,
          });
        }
        continue;
      }

      const sendRes = await sendBrevoProspectEmail({
        toEmail: candidate.email,
        toName: candidate.companyName,
        senderEmail: brevoStatus.senderEmail,
        senderName: config.senderFullName,
        replyToEmail: brevoStatus.senderEmail,
        subject: copy.subject,
        htmlContent: copy.htmlBody,
        textContent: copy.textBody,
        unsubscribeUrl: buildUnsubscribeUrl(candidate.email, siteUrl),
        tags: ["b2bpro-initial", candidate.poleSlug],
      });

      const nowIso = new Date().toISOString();
      const record: ProspectRecord = {
        id: `prs-${candidate.siren}-${Date.now()}`,
        siren: candidate.siren,
        companyName: candidate.companyName,
        city: candidate.city,
        department: candidate.department,
        domain: candidate.domain,
        websiteUrl: candidate.websiteUrl,
        email: candidate.email,
        poleSlug: candidate.poleSlug,
        serviceSlug: candidate.serviceSlug,
        serviceTitle: candidate.serviceTitle,
        servicePrice: candidate.servicePrice,
        status: sendRes.ok
          ? "emailed"
          : sendRes.accountPaused
            ? "audited"
            : sendRes.hardBounce
              ? "bounced"
              : "error",
        findings: candidate.findings,
        lastSubject: copy.subject,
        brevoMessageId: sendRes.ok ? sendRes.messageId : undefined,
        emailedAt: sendRes.ok ? nowIso : undefined,
        updatedAt: nowIso,
        error: sendRes.ok || sendRes.accountPaused ? undefined : sendRes.error,
      };

      mutableLedger.unshift(record);

      if (sendRes.ok) {
        initialSent += 1;
        budgetLeft -= 1;
        if (previewSamples.length < 4) {
          previewSamples.push({
            companyName: candidate.companyName,
            email: candidate.email,
            domain: candidate.domain,
            serviceSlug: candidate.serviceSlug,
            subject: copy.subject,
            textBody: copy.textBody,
            issues: candidate.findings.issues,
          });
        }

        await db.lead
          .upsert({
            where: { email: normalizeEmail(candidate.email) },
            update: { name: candidate.companyName },
            create: {
              email: normalizeEmail(candidate.email),
              name: candidate.companyName,
              source: `prospection-b2b:${candidate.poleSlug}`,
            },
          })
          .catch(() => {});

        appendHistoryJsonl({
          event: "initial_sent",
          wave,
          email: candidate.email,
          domain: candidate.domain,
          companyName: candidate.companyName,
          serviceSlug: candidate.serviceSlug,
          messageId: sendRes.messageId,
          usedAi: copy.usedAi,
        });
      } else if (sendRes.accountPaused) {
        relayPaused = true;
        errors.push(`Relais e-mail en attente d'activation (${candidate.email}) : ${sendRes.error}`);
        break;
      } else {
        errors.push(`Envoi ${candidate.email}: ${sendRes.error}`);
      }

      await sleep(800);
    }
  }

  // ── 3. Syndication Dev.to & Kit Social quotidien ──────────────────────────
  let devtoPublished = null;
  if (!opts.skipSocial) {
    const devtoRes = await publishNextBlogToDevto({
      state: socialState,
      dailyCap: config.dailyDevtoCap,
      dryRun,
    });
    if (devtoRes.error) errors.push(devtoRes.error);
    devtoPublished = devtoRes.record;

    const kit = await generateDailySocialKit();
    if (!dryRun) {
      const updatedPosts = devtoPublished
        ? [devtoPublished, ...socialState.posts]
        : socialState.posts;
      await saveSocialState({ posts: updatedPosts, kit });
      if (devtoPublished) {
        appendHistoryJsonl({
          event: "devto_published",
          wave,
          blogSlug: devtoPublished.blogSlug,
          externalUrl: devtoPublished.externalUrl,
        });
      }
    }
  }

  // ── 4. Sauvegardes, journal admin & rapport propriétaire ──────────────────
  const totalToday = dryRun
    ? sentTodayAlready
    : sentTodayAlready + initialSent + followupsSent;

  const summary: WaveRunSummary = {
    wave,
    dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    emailsSentToday: totalToday,
    dailyEmailCap: config.dailyEmailCap,
    newAudited,
    initialSent,
    followupsSent,
    devtoPublished,
    errors,
    previewSamples,
  };

  if (!dryRun) {
    await saveProspectLedger(mutableLedger);
    if (nextCursor !== config.searchCursor) {
      await saveProspectingConfig({ searchCursor: nextCursor });
    }
    await logAdminAction(
      "prospection.wave",
      `Vague « ${wave} » : ${initialSent} email(s) initial(aux), ${followupsSent} relance(s), ${newAudited} entreprise(s) auditée(s)${devtoPublished ? `, article Dev.to publié (${devtoPublished.externalUrl})` : ""}.`,
    );
    await sendOwnerWaveSummaryEmail(summary, brevoStatus.senderEmail).catch(() => false);
  }

  return summary;
}
