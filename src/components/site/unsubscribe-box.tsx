"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Home, MailX } from "lucide-react";

interface UnsubscribeBoxProps {
  initialDone: boolean;
  initialEmail: string;
}

export function UnsubscribeBox({ initialDone, initialEmail }: UnsubscribeBoxProps) {
  const [email, setEmail] = useState(initialEmail);
  const [done, setDone] = useState(initialDone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Écrivez une adresse e-mail valide.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/prospecting/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Impossible d'enregistrer votre demande. Réessayez.");
        return;
      }
      setDone(true);
    } catch {
      setError("Problème de connexion. Réessayez dans quelques secondes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {done ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="break-words text-2xl font-extrabold tracking-tight">
            C&apos;est fait. Vous êtes désinscrit.
          </h1>
          <p className="break-words text-[16px] leading-7 text-muted-foreground">
            {email
              ? `L'adresse ${email} est retirée immédiatement. Vous ne recevrez plus aucun e-mail de prospection.`
              : "Votre adresse est retirée immédiatement. Vous ne recevrez plus aucun e-mail de prospection."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              Retourner à l&apos;accueil
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
              <MailX className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="break-words text-2xl font-extrabold tracking-tight">
              Ne plus recevoir nos e-mails
            </h1>
          </div>

          <p className="text-[16px] leading-7 text-muted-foreground">
            Écrivez votre adresse e-mail ci-dessous, puis appuyez sur le bouton vert.
          </p>

          <div className="space-y-2">
            <label htmlFor="unsub-email" className="block text-[15px] font-semibold">
              Votre adresse e-mail
            </label>
            <input
              id="unsub-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@votre-entreprise.fr"
              className="min-h-[56px] w-full rounded-2xl border border-input bg-background px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[60px] w-full items-center justify-center rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Enregistrement en cours..." : "Me désinscrire maintenant"}
          </button>

          <Link
            href="/"
            className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 text-[16px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Retourner à l&apos;accueil
          </Link>
        </form>
      )}
    </div>
  );
}
