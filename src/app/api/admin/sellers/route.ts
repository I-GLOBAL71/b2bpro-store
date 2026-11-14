import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { SELLERS } from "../../../../../data/gen/sellers";
import type { AdminSellerOption } from "@/lib/contracts";

/**
 * GET /api/admin/sellers — options du sélecteur de création de service (v2.6.0).
 *
 * Liste des vendeurs de la base (slug, nom, pays, niveau, note) enrichie des
 * pôles de spécialité canoniques (data/gen/sellers.ts) : le formulaire de
 * création recommande les spécialistes du pôle choisi. Garde ensureAdmin (401).
 */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const rows = await db.seller.findMany({
      orderBy: [{ name: "asc" }],
      select: { slug: true, name: true, countryLabel: true, level: true, rating: true },
    });
    const specialtyBySlug = new Map<string, string[]>();
    for (const s of SELLERS) {
      specialtyBySlug.set(s.slug, s.specialtyPoles);
    }
    const sellers: AdminSellerOption[] = rows.map((r) => ({
      ...r,
      specialtyPoles: specialtyBySlug.get(r.slug) ?? [],
    }));
    return NextResponse.json({ sellers });
  } catch (e) {
    console.error("GET /api/admin/sellers", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
