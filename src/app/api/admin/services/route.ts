import { NextRequest, NextResponse } from "next/server";
import { API_ROUTES, adminServiceCreateSchema } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { ServiceCreateError, createServiceFromAdmin } from "@/lib/admin-service-create";

/**
 * GET /api/admin/services — liste paginée pour la gestion des services.
 * Filtres : q (recherche), pole, featured ("true"/"false"), page.
 */

/**
 * POST /api/admin/services — création d'un service complet depuis le panneau
 * (v2.6.0). Corps : adminServiceCreateSchema (contracts.ts). La validation
 * serveur réplique le standard SGA™ du garde-fou : une fiche non conforme est
 * refusée AVANT insertion (jamais de 503 d'intégrité après coup).
 * Réponse : AdminServiceCreateResponse (slug/code/url + état des miniatures).
 */
export async function POST(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const parsed = adminServiceCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
        { status: 400 }
      );
    }

    const result = await createServiceFromAdmin(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ServiceCreateError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(`${API_ROUTES.adminServices} POST`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || undefined;
    const pole = sp.get("pole")?.trim() || undefined;
    const featuredParam = sp.get("featured");
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const perPage = 20;

    const settings = await getSiteSettings();
    const where: Record<string, unknown> = {};
    if (pole) where.poleSlug = pole;
    if (featuredParam === "true") where.featured = true;
    if (featuredParam === "false") where.featured = false;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { name: { contains: q } },
        { code: { contains: q } },
        { category: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      db.service.count({ where }),
      db.service.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          slug: true,
          code: true,
          title: true,
          poleSlug: true,
          category: true,
          basePrice: true,
          rating: true,
          reviewsCount: true,
          salesCount: true,
          featured: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
      minRating: settings.vitrine.minRating,
      rotationEnabled: settings.vitrine.enabled,
      services: items.map((s) => ({
        ...s,
        rotationEligible: s.rating >= settings.vitrine.minRating,
        url: `/services/${s.slug}`,
      })),
    });
  } catch (e) {
    console.error(`${API_ROUTES.adminServices}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
