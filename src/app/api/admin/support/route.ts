import { NextRequest, NextResponse } from "next/server";
import { API_ROUTES } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/support — boîte « Messages clients » du propriétaire (v2.2.0).
 *
 *   • ?summary=1 → { unreadTotal, openThreads } uniquement (badge de navigation
 *     du panneau — interroger toutes les 45 s, réponse minuscule).
 *   • sinon → { threads, unreadTotal, openThreads } : fils triés par dernière
 *     activité (extrait du dernier message + compteur de messages + non-lus).
 */
export async function GET(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const summaryOnly = req.nextUrl.searchParams.get("summary") === "1";

    const [unreadTotal, openThreads] = await Promise.all([
      db.supportThread.aggregate({ _sum: { unreadForOwner: true } }),
      db.supportThread.count({ where: { status: "open" } }),
    ]);
    const unread = unreadTotal._sum.unreadForOwner ?? 0;

    if (summaryOnly) {
      return NextResponse.json({ unreadTotal: unread, openThreads });
    }

    const threads = await db.supportThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({
      unreadTotal: unread,
      openThreads,
      threads: threads.map((t) => {
        const last = t.messages[0];
        return {
          id: t.id,
          email: t.email,
          name: t.name,
          status: t.status,
          unreadForOwner: t.unreadForOwner,
          lastMessageAt: t.lastMessageAt.toISOString(),
          messageCount: t._count.messages,
          lastMessage: last
            ? {
                role: last.role === "owner" ? "owner" : "client",
                excerpt:
                  last.content.length > 120
                    ? `${last.content.slice(0, 120)}…`
                    : last.content,
                createdAt: last.createdAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport} GET`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
