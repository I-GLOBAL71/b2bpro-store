import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_LOG_ACTIONS, API_ROUTES } from "@/lib/contracts";
import { isAdminSession } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/settings";

/** POST /api/admin/logout — révoque la session (cookie expiré). */
export async function POST() {
  if (await isAdminSession()) {
    await logAdminAction(ADMIN_LOG_ACTIONS.LOGOUT, "Déconnexion admin");
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
