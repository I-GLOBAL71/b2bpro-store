/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  RÉGLAGES DU SITE — lecture/écriture de la configuration dynamique
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Source de vérité typée : section v1.5.0 de src/lib/contracts.ts.
 *  Stockage : modèle Prisma SiteConfig (une ligne par groupe, value = JSON).
 *  Stratégie : DEFAULT_SITE_SETTINGS ← surcharges base validées par zod.
 *  Une ligne absente, vide ou invalide = valeur par défaut (jamais de crash).
 *
 *  Lecture : getSiteSettings() — mémoïsée par requête (React cache).
 *  Écriture : saveSettingsGroup() — réservée aux routes admin authentifiées.
 */

import { cache } from "react";
import { db } from "@/lib/db";
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsGroupSchemas,
  type SettingsGroup,
  type SiteSettingsDTO,
} from "@/lib/contracts";

/** Clone défensif des défauts (jamais de mutation de la constante importée). */
function defaults(): SiteSettingsDTO {
  return structuredClone(DEFAULT_SITE_SETTINGS);
}

/**
 * Réglages effectifs du site : défauts ← lignes SiteConfig validées.
 * Tolérante à une base indisponible (retour aux défauts du code).
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsDTO> => {
  const merged = defaults();
  try {
    const rows = await db.siteConfig.findMany();
    for (const row of rows) {
      applyGroup(merged, row.key as SettingsGroup, row.value);
    }
  } catch {
    // Base indisponible (ex. DATABASE_URL absent en pré-prod) : défauts du code.
  }
  return merged;
});

/** Applique une ligne de config sur l'objet fusionné — défensif, ne lève jamais. */
function applyGroup(target: SiteSettingsDTO, group: SettingsGroup, rawValue: string): void {
  const schema = siteSettingsGroupSchemas[group];
  if (!schema) return; // groupe inconnu (future donnée) → ignoré silencieusement
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawValue);
  } catch {
    return; // JSON corrompu → défaut conservé
  }
  if (typeof candidate !== "object" || candidate === null) return;
  const parsed = schema.safeParse({ ...(target[group] as object), ...(candidate as object) });
  if (!parsed.success) return; // forme invalide → défaut conservé
  Object.assign(target[group], parsed.data);
}

/**
 * Sauvegarde un patch partiel d'un groupe de réglages.
 * Fusionne : réglages effectifs actuels ← patch, puis valide la forme complète
 * avant écriture (une valeur hors bornes est rejetée, jamais persistée).
 * Retourne le groupe mis à jour — lève si la validation échoue.
 */
export async function saveSettingsGroup<G extends SettingsGroup>(
  group: G,
  patch: Record<string, unknown>
): Promise<SiteSettingsDTO[G]> {
  const current = await getSiteSettings();
  const merged = { ...(current[group] as object), ...patch };
  const schema = siteSettingsGroupSchemas[group];
  const parsed = schema.safeParse(merged);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ConfigValidationError(
      `Valeur invalide pour « ${first?.path.join(".") || group} » : ${first?.message ?? "forme inattendue"}`,
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }
  await db.siteConfig.upsert({
    where: { key: group },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: group, value: JSON.stringify(parsed.data) },
  });
  return parsed.data as SiteSettingsDTO[G];
}

/** Erreur de validation de configuration (message orienté panneau admin). */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { path: string; message: string }[]
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

/** Journalise une action d'administration (best-effort : jamais bloquant). */
export async function logAdminAction(action: string, detail: string): Promise<void> {
  try {
    await db.adminLog.create({ data: { action, detail } });
  } catch {
    // Le journal ne doit jamais faire échouer l'action elle-même.
  }
}
