import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  API_ROUTES,
  ADMIN_LOG_ACTIONS,
  SUPPORT_THREAD_STATUS,
  supportThreadPostSchema,
  type SupportThreadResponse,
} from "@/lib/contracts";
import { logAdminAction } from "@/lib/settings";
import { notifyOwnerClientQuestion } from "@/lib/mailer";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  /api/support/thread — conversation client ↔ prestataire humain (v2.2.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le prestataire humain de la plateforme est unique : le PROPRIÉTAIRE.
 *   • GET  : le fil complet du client connecté (email de session = identité).
 *   • POST : dépose une question. Chaque question déclenche :
 *       - un email URGENT au propriétaire (OWNER_EMAIL — mailer.ts) ;
 *       - une trace « support.message » dans le journal d'audit
 *         → badge « Messages clients » du panneau d'administration.
 *     Le fil (ré)ouvre automatiquement, le compteur de non-lus du
 *     propriétaire s'incrémente, et le Lead reste synchronisé (même email).
 *
 * Garde : session cliente exigée (identité vérifiée Google / lien magique —
 * le fil ne peut JAMAIS être anonyme). Anti-abus : 10 messages / minute / IP.
 */

// ── Anti-abus (fenêtre glissante par IP — même garde-fou que service-chat) ──
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const RATE_HITS = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = (RATE_HITS.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  window.push(now);
  RATE_HITS.set(ip, window);
  if (RATE_HITS.size > 5_000) {
    for (const [key, stamps] of RATE_HITS) {
      if (stamps.every((t) => now - t >= RATE_WINDOW_MS)) RATE_HITS.delete(key);
    }
  }
  return window.length > RATE_MAX;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/** Email de session, normalisé — null si visiteur non connecté. */
async function sessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const raw = session?.user?.email;
  return typeof raw === "string" && raw ? raw.toLowerCase().trim() : null;
}

// ── GET : fil + messages du client connecté ──────────────────────────────────
export async function GET() {
  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json(
      { error: "Connexion requise pour discuter avec le prestataire." },
      { status: 401 }
    );
  }

  try {
    const thread = await db.supportThread.findUnique({
      where: { email },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
    });

    const body: SupportThreadResponse = {
      thread: thread
        ? {
            email: thread.email,
            name: thread.name,
            status: thread.status === SUPPORT_THREAD_STATUS.CLOSED ? "closed" : "open",
          }
        : null,
      messages: (thread?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role === "owner" ? "owner" : "client",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error(`GET ${API_ROUTES.supportThread}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── POST : nouvelle question du client ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json(
      {
        error:
          "Connexion requise pour écrire au prestataire. Identifiez-vous (Google ou lien email) puis reprenez la conversation.",
      },
      { status: 401 }
    );
  }

  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Un court instant : trop de messages à la suite. Revenez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const parsed = supportThreadPostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Message invalide" },
        { status: 400 }
      );
    }
    const message = parsed.data.message;

    const session = await getServerSession(authOptions);
    const name =
      typeof session?.user?.name === "string" && session.user.name ? session.user.name : null;

    // Lead synchronisé (même identité que les commandes — traçabilité unique).
    await db.lead.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name, source: "support-humain" },
    });

    // Fil (ré)ouvert : une nouvelle question du client rouvre toujours l'échange.
    const thread = await db.supportThread.upsert({
      where: { email },
      update: {
        name: name ?? undefined,
        status: SUPPORT_THREAD_STATUS.OPEN,
        unreadForOwner: { increment: 1 },
        lastMessageAt: new Date(),
      },
      create: {
        email,
        name,
        status: SUPPORT_THREAD_STATUS.OPEN,
        unreadForOwner: 1,
      },
    });

    await db.supportMessage.create({
      data: {
        threadId: thread.id,
        role: "client",
        content: message,
      },
    });

    // Contexte de la notification : combien de commandes ce client a-t-il passées ?
    const ordersCount = await db.order.count({ where: { lead: { email } } }).catch(() => 0);

    // Notification URGENTE du propriétaire + trace journal (jamais bloquantes).
    await notifyOwnerClientQuestion({
      clientEmail: email,
      clientName: name,
      message,
      ordersCount,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.SUPPORT_MESSAGE,
      `Question de ${email}${name ? ` (${name})` : ""} : « ${message.slice(0, 140)}${message.length > 140 ? "…" : ""} »`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`POST ${API_ROUTES.supportThread}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
