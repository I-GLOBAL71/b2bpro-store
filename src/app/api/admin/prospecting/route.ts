import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { ADMIN_LOG_ACTIONS } from "@/lib/contracts";
import { getSiteUrl } from "@/lib/env";
import { addBrevoBlockedContact, getBrevoAccountStatus } from "@/lib/prospecting/brevo-sender";
import { generateDailySocialKit } from "@/lib/prospecting/social-publisher";
import { probeAndAuditDomain } from "@/lib/prospecting/sourcer";
import {
  addOptoutEmail,
  countEmailsSentToday,
  getOptoutList,
  getProspectLedger,
  getProspectingConfig,
  getSocialState,
  saveProspectingConfig,
  saveSocialState,
  upsertProspectRecord,
} from "@/lib/prospecting/store";
import {
  manualProspectAddSchema,
  prospectingConfigPatchSchema,
} from "@/lib/prospecting/types";
import { logAdminAction } from "@/lib/settings";

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const [config, ledger, optouts, social, brevo] = await Promise.all([
      getProspectingConfig(),
      getProspectLedger(),
      getOptoutList(),
      getSocialState(),
      getBrevoAccountStatus(),
    ]);

    const kit = social.kit.length > 0 ? social.kit : await generateDailySocialKit();
    if (social.kit.length === 0 && kit.length > 0) {
      await saveSocialState({ posts: social.posts, kit });
    }

    const emailsSentToday = countEmailsSentToday(ledger);
    const totalEmailed = ledger.filter(
      (r) => r.status === "emailed" || r.status === "followed_up",
    ).length;
    const totalFollowedUp = ledger.filter((r) => r.status === "followed_up").length;
    const siteUrl = getSiteUrl();

    return NextResponse.json({
      config,
      stats: {
        emailsSentToday,
        dailyEmailCap: config.dailyEmailCap,
        totalAudited: ledger.length,
        totalEmailed,
        totalFollowedUp,
        totalOptouts: optouts.length,
        devtoPublishedCount: social.posts.length,
      },
      brevo: {
        configured: brevo.configured,
        ok: brevo.ok,
        creditsRemaining: brevo.creditsRemaining,
        senderEmail: brevo.senderEmail,
        error: brevo.error,
      },
      ledger: ledger.slice(0, 60),
      optouts: optouts.slice(0, 30),
      social: {
        posts: social.posts.slice(0, 20),
        kit,
      },
      rssUrls: {
        pinterest: `${siteUrl}/pinterest-rss.xml`,
        syndication: `${siteUrl}/syndication-rss.xml`,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/prospecting", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => null);
    const parsed = prospectingConfigPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Réglages invalides" },
        { status: 400 },
      );
    }

    const updated = await saveProspectingConfig(parsed.data);
    await logAdminAction(
      ADMIN_LOG_ACTIONS.CONFIG_UPDATE,
      `Réglages prospection mis à jour (${Object.keys(parsed.data).join(", ")})`,
    );
    return NextResponse.json({ ok: true, config: updated });
  } catch (e) {
    console.error("PATCH /api/admin/prospecting", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => null);
    const parsed = manualProspectAddSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 },
      );
    }

    if (parsed.data.action === "add_optout") {
      const list = await addOptoutEmail(parsed.data.email);
      await addBrevoBlockedContact(parsed.data.email);
      return NextResponse.json({ ok: true, optoutsCount: list.length });
    }

    const rawUrl = parsed.data.websiteUrl;
    const domain = rawUrl
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]!;

    const audited = await probeAndAuditDomain({
      domain,
      siren: `MANUEL-${Date.now()}`,
      companyName: parsed.data.companyName || domain,
      city: parsed.data.city || "France",
      department: "FR",
      poleSlug: parsed.data.poleSlug || "seo-geo-medias",
      overrideEmail: parsed.data.email,
    });

    if (!audited) {
      return NextResponse.json(
        {
          error:
            "Site inaccessible ou aucune adresse e-mail publique trouvée sur ce domaine. Vérifiez l'adresse ou ajoutez l'e-mail manuellement.",
        },
        { status: 422 },
      );
    }

    const record = {
      id: `prs-man-${Date.now()}`,
      siren: audited.siren,
      companyName: audited.companyName,
      city: audited.city,
      department: audited.department,
      domain: audited.domain,
      websiteUrl: audited.websiteUrl,
      email: audited.email,
      poleSlug: audited.poleSlug,
      serviceSlug: audited.serviceSlug,
      serviceTitle: audited.serviceTitle,
      servicePrice: audited.servicePrice,
      status: "audited" as const,
      findings: audited.findings,
      updatedAt: new Date().toISOString(),
    };

    await upsertProspectRecord(record);
    return NextResponse.json({ ok: true, prospect: record });
  } catch (e) {
    console.error("POST /api/admin/prospecting", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
