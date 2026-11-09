import { NextResponse } from "next/server";
import { API_ROUTES, type RotationInfoDTO } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { getVitrine, upcomingFirstIndices } from "@/lib/rotation";

/** GET /api/admin/vitrine — état live de la rotation + file d'attente des 1res positions. */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const [vitrine, settings] = await Promise.all([getVitrine(), getSiteSettings()]);
    const rotation: RotationInfoDTO | null = vitrine.rotation;

    // File d'attente : services qui prendront la 1ère position aux 6 prochaines fenêtres.
    let upcoming: { window: number; slug: string; title: string; poleSlug: string }[] = [];
    if (rotation) {
      const eligible = await db.service.findMany({
        where: { rating: { gte: settings.vitrine.minRating } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { slug: true, title: true, poleSlug: true },
      });
      const indices = upcomingFirstIndices(eligible.length, rotation.slotCount, rotation.windowIndex, 6);
      upcoming = indices.map((idx, k) => ({
        window: rotation.windowIndex + k + 1,
        ...eligible[idx]!,
      }));
    }

    return NextResponse.json({
      rotation,
      current: vitrine.services.map((s, i) => ({
        position: i + 1,
        slug: s.slug,
        title: s.title,
        poleSlug: s.poleSlug,
        rating: s.rating,
        basePrice: s.basePrice,
      })),
      upcoming,
    });
  } catch (e) {
    console.error(`${API_ROUTES.adminVitrine}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
