import { NextResponse } from "next/server";
import { API_ROUTES, type AdminLogDTO } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/** GET /api/admin/logs — journal d'audit (60 dernières actions). */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const rows = await db.adminLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 60,
    });
    const logs: AdminLogDTO[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      detail: r.detail,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ logs });
  } catch (e) {
    console.error(`${API_ROUTES.adminLogs}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
