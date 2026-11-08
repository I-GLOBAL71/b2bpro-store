import { NextRequest, NextResponse } from "next/server";
import { getServices } from "@/lib/queries";

/** API publique : liste des services avec filtres (pour intégrations et clients légers). */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const result = await getServices({
      q: sp.get("q") || undefined,
      pole: sp.get("pole") || undefined,
      sort: sp.get("sort") || undefined,
      page: Math.max(1, parseInt(sp.get("page") || "1", 10) || 1),
      perPage: Math.min(48, parseInt(sp.get("perPage") || "24", 10) || 24),
    });
    return NextResponse.json({
      total: result.total,
      page: result.page,
      pages: result.pages,
      services: result.items.map((s) => ({
        slug: s.slug,
        title: s.title,
        category: s.category,
        pole: s.poleSlug,
        basePrice: s.basePrice,
        deliveryDays: s.deliveryDays,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        salesCount: s.salesCount,
        seller: s.seller.name,
        url: `/services/${s.slug}`,
      })),
    });
  } catch (e) {
    console.error("GET /api/services", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
