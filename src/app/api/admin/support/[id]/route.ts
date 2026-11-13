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
 * /api/admin/support/[id] — pilotage d'un fil client par le support (v2.2.0).
 *
 *   • GET    : fil + messages ; la consultation REMET À ZÉRO le compteur de
 *              non-lus (lecture = accusé de réception implicite).
 *   • POST   : réponse du support → enregistrée + TRANSMISE AU CLIENT PAR
 *              EMAIL en référençant la ROUTE de la question visée (v2.5.0) :
 *              - `replyTo` (optionnel) : id d'une question de CE fil — validé
 *                serveur (404 si le message n'appartient pas au fil) : la
 *                réponse ne peut partir que vers le client du fil, jamais
 *                vers un autre ;
 *              - sans `replyTo` : la dernière question client du fil.
 *              L'email au client porte l'objet « Réponse à votre question
 *              Q-XXXXXX » — chaque question a son fil de discussion.
 *   • PATCH  : ouverture / fermeture du fil (clôture après résolution).
 *
 * Réponses : 200 · 400 payload invalide · 401 session admin requise · 404 fil
 * ou question inconnu · 500 erreur serveur. `emailSent:false` sur POST = SMTP
 * absent (développement) — la réponse reste visible dans l'espace client.
 */

/** Dernière question client du fil (cible implicite d'une réponse). */
async function lastClientQuestion(threadId: string) {
  const last = await db.supportMessage.findFirst({
    where: { threadId, role: "client" },
    orderBy: { createdAt: "desc" },
    select: { id: true, reference: true, content: true },
  });
  return last;
}

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
          reference: m.reference,
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

    // ── Cible de la réponse (v2.5.0) : la question visée appartient-elle à CE fil ?
    // Garde anti-croisement : un replyTo d'un AUTRE fil est rejeté (404) —
    // le client X ne peut jamais recevoir la réponse destinée au client Y.
    let target = null as { id: string; reference: string | null; content: string } | null;
    if (parsed.data.replyTo) {
      target = await db.supportMessage.findUnique({
        where: { id: parsed.data.replyTo },
        select: { id: true, reference: true, content: true },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Question inconnue — la réponse n'a pas été envoyée." },
          { status: 404 }
        );
      }
      const owned = await db.supportMessage.findFirst({
        where: { id: target.id, threadId: thread.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          {
            error:
              "Cette question appartient à un autre fil — répondez depuis le fil du client concerné (aucun envoi effectué).",
          },
          { status: 400 }
        );
      }
    } else {
      // Sans cible explicite : la dernière question client de CE fil.
      target = await lastClientQuestion(thread.id);
    }

    // La réponse rouvre le fil si besoin et relance l'horloge d'activité.
    await db.supportMessage.create({
      data: { threadId: thread.id, role: "owner", content: message },
    });
    await db.supportThread.update({
      where: { id: thread.id },
      data: { status: SUPPORT_THREAD_STATUS.OPEN, lastMessageAt: new Date() },
    });

    // Transcription email au client, RÉFÉRENÇANT la route de sa question
    // (jamais bloquante — dev : trace console). Aucune adresse exposée au
    // client : l'expéditeur est l'identité du site (SMTP_FROM).
    const emailSent = await sendClientOwnerReply({
      to: thread.email,
      clientName: thread.name,
      reply: message,
      questionRef: target?.reference ?? null,
      questionExcerpt: target ? `${target.content.slice(0, 160)}${target.content.length > 160 ? "…" : ""}` : null,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.SUPPORT_REPLY,
      `Réponse${target?.reference ? ` à ${target.reference}` : ""} pour ${thread.email} : « ${message.slice(0, 140)}${message.length > 140 ? "…" : ""} »${emailSent ? "" : " (email client non envoyé : SMTP absent)"}`
    );

    return NextResponse.json({ ok: true, emailSent, questionRef: target?.reference ?? null });
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
      `Fil ${thread.email} : ${status === SUPPORT_THREAD_STATUS.CLOSED ? "clôturé" : "réouvert"} par le support`
    );

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport}/[id] PATCH`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
