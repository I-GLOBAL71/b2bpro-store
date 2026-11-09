"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Connexion administrateur. Le mot de passe est vérifié côté serveur
 * (POST /api/admin/login) : cookie HttpOnly signé, anti-brute-force 5/10 min.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Connexion impossible");
      toast.success("Bienvenue dans le panneau d'administration !");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-stone-950 px-4 py-16">
      <div className="hero-grid-bg absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-black text-white shadow-lg">
              B
            </span>
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-white">
              Administration b2bpro<span className="text-emerald-400">.store</span>
            </h1>
            <p className="mt-1.5 text-[13px] text-stone-400">
              Rotation équitable, réglages du site, journal d&apos;audit.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-[13px] font-semibold text-stone-200">
                Mot de passe administrateur
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                  aria-hidden="true"
                />
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  autoFocus
                  className="h-11 border-stone-700 bg-stone-800/70 pl-10 text-white placeholder:text-stone-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!password || loading}
              className="h-11 w-full gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-[14px] font-bold text-stone-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-300"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {loading ? "Vérification…" : "Accéder au panneau"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-stone-800 bg-stone-800/40 p-3.5 text-[12px] leading-5 text-stone-400">
            <p className="flex items-center gap-1.5 font-semibold text-stone-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Session sécurisée 8 h · cookie signé · 5 essais / 10 min
            </p>
            {isDev ? (
              <p className="mt-1.5">
                Environnement de développement — mot de passe par défaut :{" "}
                <code className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-emerald-300">b2bpro-admin</code>
                . Définissez <code className="font-mono">ADMIN_PASSWORD</code> pour le production.
              </p>
            ) : (
              <p className="mt-1.5">
                Production : définissez la variable <code className="font-mono">ADMIN_PASSWORD</code>{" "}
                (Vercel → Settings → Environment Variables).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
