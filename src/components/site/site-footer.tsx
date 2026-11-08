"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POLE_LABELS } from "@/lib/site";
import { toast } from "sonner";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Veuillez saisir un email valide.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Inscription confirmée ! Vous recevrez nos meilleurs conseils B2B chaque semaine.");
    } catch {
      toast.error("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="b2bpro.store — accueil">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-300 text-[15px] font-black text-stone-950">
                B
              </span>
              <span className="text-lg font-extrabold tracking-tight text-white">
                b2bpro<span className="text-emerald-400">.store</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-[13.5px] leading-6 text-stone-400">
              La place de marché des services digitaux B2B francophones. 112 services experts,
              des vendeurs vérifiés notés 4,2 à 5,0 ★, une livraison en 2-3 jours et un paiement
              sécurisé qui ne se libère qu'après votre validation.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900 px-3.5 py-1.5 text-[12.5px] text-stone-300">
              <Globe className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Taillé pour tous les pays francophones
            </div>
          </div>

          <nav className="lg:col-span-2" aria-label="Pôles de services">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">Pôles phares</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {Object.entries(POLE_LABELS).slice(0, 7).map(([slug, label]) => (
                <li key={slug}>
                  <Link href={`/categories/${slug}`} className="transition-colors hover:text-emerald-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Plateforme">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">Plateforme</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li><Link href="/services" className="transition-colors hover:text-emerald-400">Tous les services</Link></li>
              <li><Link href="/categories/ia-rag-data" className="transition-colors hover:text-emerald-400">IA & Data</Link></li>
              <li><Link href="/categories/seo-geo-medias" className="transition-colors hover:text-emerald-400">SEO & GEO IA</Link></li>
              <li><Link href="/blog" className="transition-colors hover:text-emerald-400">Blog</Link></li>
              <li><Link href="/support" className="transition-colors hover:text-emerald-400">Support IA 7j/7</Link></li>
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">
              La newsletter des décideurs francophones
            </h3>
            <p className="mt-4 text-[13.5px] leading-6 text-stone-400">
              Chaque semaine : une méthode data appliquée, une opportunité de marché et un
              conseil d'expert. Zéro spam, désinscription en un clic.
            </p>
            {done ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-[13.5px] text-emerald-300">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                Inscription confirmée. À très vite dans votre boîte mail !
              </div>
            ) : (
              <form onSubmit={subscribe} className="mt-4 flex gap-2">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  aria-label="Votre adresse email"
                  className="h-10 border-stone-800 bg-stone-900 text-[13.5px] text-white placeholder:text-stone-600"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 shrink-0 gap-1.5 bg-emerald-500 px-4 text-[13.5px] font-semibold text-stone-950 hover:bg-emerald-400"
                >
                  {loading ? "…" : "S'inscrire"}
                  {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-900 pt-6 text-[12.5px] text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} b2bpro.store — Tous droits réservés.</p>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>France</span><span>Québec</span><span>Belgique</span><span>Suisse</span>
            <span>Sénégal</span><span>Côte d'Ivoire</span><span>Cameroun</span>
            <span className="sm:hidden">Maroc · Tunisie · RDC · et +</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
