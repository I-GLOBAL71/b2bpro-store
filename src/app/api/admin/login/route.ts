import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_HOURS,
  adminLoginRequestSchema,
  ADMIN_LOG_ACTIONS,
  API_ROUTES,
} from "@/lib/contracts";
import {
  clearLoginAttempts,
  clientIp,
  consumeLoginAttempt,
  createSessionToken,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/settings";

/**
 * POST /api/admin/login — authentifie l'administrateur.
 * Anti-brute-force : 5 tentatives / 10 min / IP (mémoire).
 * Réussite → cookie HttpOnly signé (HMAC-SHA256) valable ADMIN_SESSION_TTL_HOURS.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const attempt = consumeLoginAttempt(ip);
    if (!attempt.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${Math.ceil(attempt.retryAfterSeconds! / 60)} min.` },
        { status: 429, headers: { "Retry-After": String(attempt.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = adminLoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    if (!verifyAdminPassword(parsed.data.password)) {
      await logAdminAction(ADMIN_LOG_ACTIONS.LOGIN_FAILED, `Échec de connexion depuis ${ip}`);
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const { token, expiresInMinutes } = createSessionToken();
    clearLoginAttempts(ip);
    await logAdminAction(ADMIN_LOG_ACTIONS.LOGIN, `Connexion admin réussie (${expiresInMinutes} min) depuis ${ip}`);

    const res = NextResponse.json({ ok: true, expiresInMinutes });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions(ADMIN_SESSION_TTL_HOURS * 3600));
    return res;
  } catch (e) {
    console.error(`${API_ROUTES.adminLogin}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
