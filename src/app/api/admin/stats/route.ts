import { NextResponse } from "next/server";
import { API_ROUTES, type AdminStatsResponse } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getVitrine } from "@/lib/rotation";

/** GET /api/admin/stats — indicateurs du tableau de bord. */
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

    const payload: AdminStatsResponse = {
      counts: { services, sellers, reviews, orders, leads, blogPosts, knowledgeItems },
      revenuePaid: paidAgg._sum.total ?? 0,
      avgRating: Math.round((ratingAgg._avg.rating ?? 4.8) * 10) / 10,
      rotation: vitrine.rotation,
      topService: topServiceRow,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error(`${API_ROUTES.adminStats}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
