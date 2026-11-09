/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ROTATION ÉQUITABLE DE LA VITRINE D'ACCUEIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  PRINCIPE — « tapis roulant » circulaire déterministe :
 *
 *  1. Les services éligibles sont ordonnés de façon STABLE (createdAt, id).
 *  2. Le temps est découpé en fenêtres de `windowMinutes` minutes :
 *        windowIndex = floor(epochMs / windowMs)
 *     → aucune fiche ne peut occuper la 1ère place plus d'une fenêtre.
 *  3. À chaque fenêtre, le ruban avance d'un PAS (« stride ») choisi
 *     COPREMIER avec le nombre total de services éligibles :
 *        firstIndex(w) = (w × stride) mod total
 *     → comme pgcd(stride, total) = 1, la 1ère position parcourt TOUS les
 *       indices : chaque service passe en tête exactement une fois par cycle
 *       complet de `total` fenêtres. Équité mathématique stricte.
 *  4. Aucun état n'est écrit en base à chaque requête : la position se
 *     RECALCULE depuis l'horloge — pas de course critique, tous les
 *     visiteurs voient la même vitrine pour une même fenêtre.
 *
 *  Repli : rotation désactivée → comportement historique (best-sellers figés
 *  `featured` + ventes décroissantes), conservé à l'identique.
 */

import { cache } from "react";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import type { RotationInfoDTO, VitrineResultDTO, VitrineServiceDTO } from "@/lib/contracts";

/** pgcd binaire — total ≤ quelques milliers, ample.
 *  Primalité NON requise : seul le PGCD compte (théorème de Bézout).
 */
function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return Math.abs(a);
}

/** Pas de rotation : plus petit entier ≥ slotCount copremier avec total. */
export function rotationStride(total: number, slotCount: number): number {
  if (total <= 1) return 1;
  let stride = Math.max(1, Math.min(slotCount, total));
  // total + 1 est toujours copremier avec total → boucle bornée par construction.
  while (gcd(stride, total) !== 1) stride += 1;
  return stride;
}

/**
 * Indices (positions dans la liste ordonnée des éligibles) affichés pour la
 * fenêtre `windowIndex` : bloc contigu [f, f+count-1] modulo total, avec
 * f = windowIndex × stride mod total.
 *
 * Garanties (total > 0) :
 *   • `count` indices uniques (count = min(slotCount, total)) ;
 *   • l'indice 0 du résultat change à CHAQUE fenêtre (stride non multiple
 *     de total) — exigence produit « pas plus de N minutes en 1ère place » ;
 *   • sur `total` fenêtres consécutives, chaque indice passe en position 0.
 */
export function rotationWindowIndices(total: number, slotCount: number, windowIndex: number): number[] {
  if (total <= 0) return [];
  const count = Math.min(slotCount, total);
  const stride = rotationStride(total, count);
  // (w × stride) mod total ≡ ((w mod total) × stride + i) mod total — arithmétique modulaire.
  const first = ((((windowIndex % total) + total) % total) * stride) % total;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push((first + i) % total);
  }
  return indices;
}

/** Champs minimaux d'une carte de vitrine (contrat VitrineServiceDTO). */
const VITRINE_SELECT = {
  slug: true,
  title: true,
  shortDesc: true,
  poleSlug: true,
  category: true,
  basePrice: true,
  deliveryDays: true,
  rating: true,
  reviewsCount: true,
  salesCount: true,
  thumbUrls: true,
  seller: { select: { name: true, countryLabel: true } },
} as const;

/**
 * Vitrine d'accueil courante : services à afficher + état de rotation.
 * Mémoïsée par requête (la page d'accueil et ses enfants ne la calculent qu'une fois).
 */
export const getVitrine = cache(async (): Promise<VitrineResultDTO> => {
  const settings = await getSiteSettings();
  const v = settings.vitrine;

  // ── Mode historique : best-sellers figés (rotation désactivée) ────────────
  if (!v.enabled) {
    const services = await db.service.findMany({
      where: { featured: true },
      orderBy: [{ salesCount: "desc" }, { id: "asc" }],
      take: v.slotCount,
      select: VITRINE_SELECT,
    });
    return { services: services as VitrineServiceDTO[], rotation: null };
  }

  // ── Mode rotation équitable ────────────────────────────────────────────────
  const eligible = await db.service.findMany({
    where: { rating: { gte: v.minRating } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: VITRINE_SELECT,
  });
  const total = eligible.length;
  if (total === 0) {
    return { services: [], rotation: null };
  }

  const windowMs = v.windowMinutes * 60_000;
  const windowIndex = Math.floor(Date.now() / windowMs);
  const count = Math.min(v.slotCount, total);
  const indices = rotationWindowIndices(total, count, windowIndex);
  const services = indices
    .map((i) => eligible[i])
    .filter((s): s is (typeof eligible)[number] => Boolean(s));

  const rotation: RotationInfoDTO = {
    enabled: true,
    windowIndex,
    windowMinutes: v.windowMinutes,
    slotCount: count,
    rotatesAt: (windowIndex + 1) * windowMs,
    totalEligible: total,
    fullCycleMinutes: total * v.windowMinutes,
  };
  return { services: services as VitrineServiceDTO[], rotation };
});

/**
 * File d'attente des premières positions : quel service sera en 1ère place
 * pour les `horizon` prochaines fenêtres (aperçu admin + tests d'équité).
 */
export function upcomingFirstIndices(total: number, slotCount: number, currentWindow: number, horizon: number): number[] {
  if (total <= 0) return [];
  const stride = rotationStride(total, Math.min(slotCount, total));
  const out: number[] = [];
  for (let k = 1; k <= horizon; k++) {
    out.push((((currentWindow + k) * stride) % total + total) % total);
  }
  return out;
}
