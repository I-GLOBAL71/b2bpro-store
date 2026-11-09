"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package, Search, ChevronLeft, ChevronRight, Star, ExternalLink, Recycle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { POLE_LABELS } from "@/lib/site";
import { apiGet, apiSend } from "@/components/admin/api";
import { AdminPageHeader } from "@/components/admin/fields";

interface AdminServiceRow {
  id: string;
  slug: string;
  code: string;
  title: string;
  poleSlug: string;
  category: string;
  basePrice: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  featured: boolean;
  rotationEligible: boolean;
  url: string;
}

interface ServicesResponse {
  total: number;
  page: number;
  pages: number;
  minRating: number;
  rotationEnabled: boolean;
  services: AdminServiceRow[];
}

export default function AdminServicesPage() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pole, setPole] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      if (pole !== "all") params.set("pole", pole);
      if (featured !== "all") params.set("featured", featured);
      const d = await apiGet<ServicesResponse>(`/api/admin/services?${params.toString()}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [q, pole, featured, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0); // anti-rebond recherche
    return () => clearTimeout(t);
  }, [load, q]);

  async function toggleFeatured(row: AdminServiceRow) {
    if (toggling) return;
    setToggling(row.id);
    try {
      await apiSend(`/api/admin/services/${row.id}`, "PATCH", { featured: !row.featured });
      setData((prev) =>
        prev
          ? {
              ...prev,
              services: prev.services.map((s) =>
                s.id === row.id ? { ...s, featured: !row.featured } : s
              ),
            }
          : prev
      );
      toast.success(
        row.featured
          ? "Retiré des mis en avant (best-sellers)"
          : "Ajouté aux mis en avant (best-sellers)"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Services"
        description="Catalogue complet — recherche, filtres et pilotage de la mise en avant éditoriale (mode repli best-sellers)."
        icon={<Package className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher (titre, code, catégorie)…"
            aria-label="Rechercher un service"
            className="pl-9"
          />
        </div>
        <Select
          value={pole}
          onValueChange={(v) => {
            setPole(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filtrer par pôle">
            <SelectValue placeholder="Tous les pôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pôles</SelectItem>
            {Object.entries(POLE_LABELS).map(([slug, label]) => (
              <SelectItem key={slug} value={slug}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={featured}
          onValueChange={(v) => {
            setFeatured(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrer par mise en avant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mis en avant : tous</SelectItem>
            <SelectItem value="true">Mis en avant only</SelectItem>
            <SelectItem value="false">Non mis en avant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11.5px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Pôle</th>
                <th className="px-4 py-3 text-right font-semibold">Prix</th>
                <th className="px-4 py-3 text-right font-semibold">Note</th>
                <th className="px-4 py-3 text-right font-semibold">Ventes</th>
                <th className="px-4 py-3 text-center font-semibold">Rotation</th>
                <th className="px-4 py-3 text-center font-semibold">En avant</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading &&
                data?.services.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="max-w-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                          {s.code}
                        </span>
                        <Link href={s.url} className="line-clamp-1 font-semibold hover:text-primary" title={s.title}>
                          {s.title}
                        </Link>
                        <Link
                          href={s.url}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          aria-label={`Ouvrir la fiche ${s.title}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{POLE_LABELS[s.poleSlug] ?? s.poleSlug}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {s.basePrice.toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                        {s.rating.toString().replace(".", ",")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {s.salesCount.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.rotationEligible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                          <Recycle className="h-3 w-3" aria-hidden="true" />
                          éligible
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          exclu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={s.featured}
                        onCheckedChange={() => void toggleFeatured(s)}
                        disabled={toggling === s.id}
                        aria-label={`Mise en avant de ${s.title}`}
                      />
                    </td>
                  </tr>
                ))}
              {!loading && data && data.services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun service ne correspond à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {data.total.toLocaleString("fr-FR")} services · page {data.page}/{data.pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
