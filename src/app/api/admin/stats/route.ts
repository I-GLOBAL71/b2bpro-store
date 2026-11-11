import { NextResponse } from "next/server";
import { API_ROUTES, type AdminStatsResponse, type AuthTableHealth } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getVitrine } from "@/lib/rotation";

/**
 * GET /api/admin/stats — indicateurs du tableau de bord.
 * v2.1.3 : sonde des 4 tables NextAuth (User/Account/Session/VerificationToken).
 * Une table absente/inaccessible rend ok=false — symptôme client : connexion
 * Google qui échoue en ?error=Callback. Remède : Redeploy (le garant de
 * schéma `scripts/ensure-neon-schema.ts` recrée les tables au build).
 */
async function probeAuthTable(count: Promise<number>): Promise<AuthTableHealth> {
  try {
    return { ok: true, count: await count };
  } catch {
    return { ok: false, count: -1 };
  }
}

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const [services, sellers, reviews, orders, leads, blogPosts, knowledgeItems] = await Promise.all([
      db.service.count(),
      db.seller.count(),
      db.review.count(),
      db.order.count(),
      db.lead.count(),
      db.blogPost.count(),
      db.knowledgeItem.count(),
    ]);

    const [paidAgg, ratingAgg, topServiceRow, vitrine] = await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "PAID" } }),
      db.service.aggregate({ _avg: { rating: true } }),
      db.service.findFirst({ orderBy: [{ salesCount: "desc" }], select: { slug: true, title: true, salesCount: true } }),
      getVitrine(),
    ]);

    // Sonde d'auth : chaque compte est non-fatal (une table manquante ne doit
    // pas casser l'affichage du tableau de bord qui la signale justement).
    const [users, accounts, sessions, verificationTokens] = await Promise.all([
      probeAuthTable(db.user.count()),
      probeAuthTable(db.account.count()),
      probeAuthTable(db.session.count()),
      probeAuthTable(db.verificationToken.count()),
    ]);

    const payload: AdminStatsResponse = {
      counts: { services, sellers, reviews, orders, leads, blogPosts, knowledgeItems },
      revenuePaid: paidAgg._sum.total ?? 0,
      avgRating: Math.round((ratingAgg._avg.rating ?? 4.8) * 10) / 10,
      rotation: vitrine.rotation,
      topService: topServiceRow,
      authTables: { users, accounts, sessions, verificationTokens },
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error(`${API_ROUTES.adminStats}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
