import { NextRequest, NextResponse } from "next/server";
import {
  API_ROUTES,
  ADMIN_LOG_ACTIONS,
  SUPPORT_THREAD_STATUS,
  adminSupportReplySchema,
  adminSupportStatusSchema,
} from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/settings";
import { sendClientOwnerReply } from "@/lib/mailer";

/**
 * /api/admin/support/[id] — pilotage d'un fil client par le propriétaire (v2.2.0).
 *
 *   • GET    : fil + messages ; la consultation REMET À ZÉRO le compteur de
 *              non-lus (lecture = accusé de réception implicite du propriétaire).
 *   • POST   : réponse du prestataire humain → enregistrée + TRANSMISE AU
 *              CLIENT PAR EMAIL (sendClientOwnerReply) ; le fil reste ouvert.
 *   • PATCH  : ouverture / fermeture du fil (clôture après résolution).
 *
 * Réponses : 200 · 400 payload invalide · 401 session admin requise · 404 fil
 * inconnu · 500 erreur serveur. `emailSent:false` sur POST = SMTP absent
 * (développement) — la réponse reste visible dans l'espace client.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const thread = await db.supportThread.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!thread) {
      return NextResponse.json({ error: "Fil introuvable" }, { status: 404 });
    }

    // Consultation = lus : le badge « Messages clients » se vide.
    if (thread.unreadForOwner > 0) {
      await db.supportThread
        .update({ where: { id: thread.id }, data: { unreadForOwner: 0 } })
        .catch(() => undefined);
    }

    return NextResponse.json({
      thread: {
        id: thread.id,
        email: thread.email,
        name: thread.name,
        status: thread.status,
        createdAt: thread.createdAt.toISOString(),
        messages: thread.messages.map((m) => ({
          id: m.id,
          role: m.role === "owner" ? "owner" : "client",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport}/[id] GET`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = adminSupportReplySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Réponse invalide" },
        { status: 400 }
      );
    }
    const message = parsed.data.message;

    const thread = await db.supportThread.findUnique({ where: { id } });
    if (!thread) {
      return NextResponse.json({ error: "Fil introuvable" }, { status: 404 });
    }

    // La réponse rouvre le fil si besoin et relance l'horloge d'activité.
    await db.supportMessage.create({
      data: { threadId: thread.id, role: "owner", content: message },
    });
    await db.supportThread.update({
      where: { id: thread.id },
      data: { status: SUPPORT_THREAD_STATUS.OPEN, lastMessageAt: new Date() },
    });

    // Transcription email au client (jamais bloquante — dev : trace console).
    const emailSent = await sendClientOwnerReply({
      to: thread.email,
      clientName: thread.name,
      reply: message,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.SUPPORT_REPLY,
      `Réponse du prestataire à ${thread.email} : « ${message.slice(0, 140)}${message.length > 140 ? "…" : ""} »${emailSent ? "" : " (email client non envoyé : SMTP absent)"}`
    );

    return NextResponse.json({ ok: true, emailSent });
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport}/[id] POST`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = adminSupportStatusSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const { status } = parsed.data;

    const thread = await db.supportThread.findUnique({ where: { id } });
    if (!thread) {
      return NextResponse.json({ error: "Fil introuvable" }, { status: 404 });
    }

    await db.supportThread.update({ where: { id }, data: { status } });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.SUPPORT_REPLY,
      `Fil ${thread.email} : ${status === SUPPORT_THREAD_STATUS.CLOSED ? "clôturé" : "réouvert"} par le propriétaire`
    );

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport}/[id] PATCH`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
