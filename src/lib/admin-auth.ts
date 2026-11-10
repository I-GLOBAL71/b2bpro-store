/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AUTHENTIFICATION DU PANNEAU D'ADMINISTRATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Mécanisme : cookie HttpOnly porteur d'un jeton `exp.signature`
 *  (HMAC-SHA256, secret dérivé de ADMIN_SESSION_SECRET ou du mot de passe).
 *  - Aucun secret ne transite côté client (le mot de passe ne sert qu'au login).
 *  - Comparaisons à temps constant (timingSafeEqual) — anti canular temporel.
 *  - Limitation de tentatives en mémoire : 5 essais / 10 min / IP.
 *  - Durée de session : ADMIN_SESSION_TTL_HOURS (8 h par défaut).
 *
 *  Variables d'environnement (optionnelles, voir .env.example) :
 *   • ADMIN_PASSWORD        — mot de passe admin (défaut : « b2bpro-admin »,
 *                             à ABSOLUMENT remplacer en production).
 *   • ADMIN_SESSION_SECRET  — secret de signature des sessions (dérivation
 *                             automatique depuis le mot de passe sinon).
 *
 *  Réservé au code SERVEUR (routes API, layouts, pages serveur).
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_HOURS } from "@/lib/contracts";

const SESSION_TTL_MS = ADMIN_SESSION_TTL_HOURS * 3_600_000;
/** Fenêtre anti-brute-force. */
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_ATTEMPTS = 5;

/** Mot de passe admin effectif (env ADMIN_PASSWORD, défaut documenté). */
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "b2bpro-admin";
}

/** true si le mot de passe par défaut encore actif (alerte panneau admin). */
export function isUsingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD?.trim();
}

function sessionSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  // Dérivation stable : changer le mot de passe invalide toutes les sessions.
  return createHash("sha256").update(`b2bpro::admin::v1::${getAdminPassword()}`).digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

/** Comparaison à temps constant de deux chaînes hexadécimales. */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ─── Sessions (cookie signé) ──────────────────────────────────────────────────

export function createSessionToken(): { token: string; expiresInMinutes: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    token: `${exp}.${sign(String(exp))}`,
    expiresInMinutes: Math.round(SESSION_TTL_MS / 60_000),
  };
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const expRaw = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^\d{1,15}$/.test(expRaw) || !/^[a-f0-9]{64}$/i.test(mac)) return false;
  if (Number(expRaw) <= Date.now()) return false;
  return safeEqualHex(mac, sign(expRaw));
}

/** Session admin valide pour la requête courante (lecture du cookie). */
export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Attributs du cookie de session (HttpOnly, SameSite=Lax, Secure en prod). */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Compare un mot de passe candidat au mot de passe effectif (temps constant). */
export function verifyAdminPassword(candidate: string): boolean {
  const hashA = createHash("sha256").update(candidate, "utf-8").digest();
  const hashB = createHash("sha256").update(getAdminPassword(), "utf-8").digest();
  return timingSafeEqual(hashA, hashB);
}

// ─── Limitation de tentatives (en mémoire, par IP) ────────────────────────────

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

/** IP client approximative (derrière le gateway Vercel). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/**
 * Tente de consommer une tentative de login.
 * Retourne `allowed: false` + délai si l'IP a dépassé le quota.
 */
export function consumeLoginAttempt(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

/** Ré-arme le quota après une connexion réussie. */
export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// ─── Garde des routes API admin ───────────────────────────────────────────────

/** Réponse 401 standardisée — à retourner immédiatement si non-null. */
export async function ensureAdmin(): Promise<NextResponse | null> {
  if (await isAdminSession()) return null;
  return NextResponse.json({ error: "Session administrateur requise" }, { status: 401 });
}
