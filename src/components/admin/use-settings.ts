"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SettingsGroup, SiteSettingsDTO } from "@/lib/contracts";
import { apiGet, apiSend } from "@/components/admin/api";

/**
 * État d'un groupe de réglages : chargement depuis /api/admin/config,
    suivi des modifications, sauvegarde PATCH groupée, réinitialisation.
 */
export function useSettingsGroup<G extends SettingsGroup>(group: G) {
  const [value, setValue] = useState<SiteSettingsDTO[G] | null>(null);
  const [initial, setInitial] = useState<SiteSettingsDTO[G] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const settings = await apiGet<SiteSettingsDTO>("/api/admin/config");
        if (alive) {
          setValue(settings[group]);
          setInitial(settings[group]);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [group]);

  const dirty = useMemo(
    () => value !== null && initial !== null && JSON.stringify(value) !== JSON.stringify(initial),
    [value, initial]
  );

  /** Modifie un champ du groupe courant (typé). */
  const patch = useCallback(
    <K extends keyof SiteSettingsDTO[G]>(key: K, v: SiteSettingsDTO[G][K]) => {
      setValue((prev) => (prev === null ? prev : { ...prev, [key]: v }));
    },
    []
  );

  const save = useCallback(async () => {
    if (value === null || saving) return;
    setSaving(true);
    try {
      const res = await apiSend<{ ok: true; value: SiteSettingsDTO[G] }>(
        "/api/admin/config",
        "PATCH",
        { group, patch: value }
      );
      setValue(res.value);
      setInitial(res.value);
      toast.success(`Réglages « ${group} » enregistrés ✓`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }, [group, value, saving]);

  const reset = useCallback(() => {
    setValue(initial);
  }, [initial]);

  return { value, initial, loading, saving, error, dirty, patch, setValue, save, reset };
}
