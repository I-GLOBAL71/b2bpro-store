"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Mail,
  MailCheck,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/** Logotype officiel « G » de Google (SVG inline, aucune ressource externe). */
function GoogleGlyph() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.19 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.48 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.89-2.26 5.33-4.78 6.97l7.59 5.9c4.44-4.1 6.23-10.13 6.23-17.35z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.59-5.9c-2.15 1.45-4.92 2.3-8.3 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.48 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Dialogue de connexion — Google (1 clic) ou lien magique email (zéro mot
//  de passe). Aucune friction : pas d'inscription, pas de formulaire long.
//  Exporté depuis v2.1.0 : réutilisé par le tunnel de commande (OrderDock)
//  quand la finalisation exige un client connecté.
// ═══════════════════════════════════════════════════════════════════════════
export function SignInDialog({
  open,
  onOpenChange,
  googleEnabled,
  emailEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googleEnabled: boolean;
  emailEnabled: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Ouverture fraîche : retour à l'étape de choix.
      setSent(false);
      setSending(false);
    }
    onOpenChange(next);
  }

  async function handleGoogle() {
    // Redirige vers Google puis revient sur la page courante.
    setGoogleLoading(true);
    try {
      await signIn("google", {
        callbackUrl: window.location.pathname + window.location.search,
      });
    } catch {
      setGoogleLoading(false);
      toast.error("La connexion Google a échoué. Réessayez dans un instant.");
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }
    setSending(true);
    try {
      const res = await signIn("email", { email, redirect: false });
      if (res && (res as { error?: string }).error) throw new Error();
      setSent(true);
    } catch {
      toast.error("L'envoi du lien de connexion a échoué. Vérifiez votre adresse puis réessayez.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            {sent ? "Consultez votre boîte mail" : "Connexion à b2bpro.store"}
          </DialogTitle>
          <DialogDescription>
            {sent
              ? "Un clic sur le lien reçu et vous serez connecté — aucun mot de passe à retenir."
              : "Un compte pour suivre vos commandes et retrouver vos experts. Deux méthodes, zéro friction."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="mt-2 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-accent/30 p-5 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MailCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[14.5px] font-semibold leading-6">
                Lien de connexion envoyé à
                <br />
                <span className="text-primary">{email}</span>
              </p>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                Ouvrez cet email puis cliquez sur « Me connecter » : le lien vous
                connecte automatiquement, pendant 24 heures.
              </p>
            </div>
            <ul className="space-y-1.5 text-[12.5px] leading-5 text-muted-foreground">
              <li>· L'email arrive en général en moins d'une minute.</li>
              <li>· Pensez à vérifier vos courriers indésirables si rien n'arrive.</li>
              <li>· Vous pourrez ensuite commander en un clic, coordonnées préremplies.</li>
            </ul>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full text-[13px] text-muted-foreground"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Utiliser une autre adresse
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            {googleEnabled && (
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading}
                onClick={handleGoogle}
                className="h-12 w-full gap-2.5 rounded-full border-border bg-card text-[14.5px] font-semibold hover:bg-accent"
              >
                <GoogleGlyph />
                {googleLoading ? "Redirection vers Google…" : "Continuer avec Google"}
              </Button>
            )}

            {googleEnabled && emailEnabled && (
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            {emailEnabled ? (
              <form onSubmit={handleEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Continuer avec votre email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="h-11 rounded-full"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending}
                  className="h-11 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14px] font-bold text-white"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {sending ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
                </Button>
                <p className="text-center text-[11.5px] leading-4 text-muted-foreground">
                  Lien personnel valable 24 h. Aucun mot de passe, aucune carte,
                  aucun engagement.
                </p>
              </form>
            ) : !googleEnabled ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-[13px] leading-6 text-amber-800">
                Les méthodes de connexion seront activées d'ici quelques instants.
                Vos commandes restent possibles en invité, directement depuis
                chaque fiche service.
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Erreurs d'authentification — traduction FR + signalée une seule fois.
//  NextAuth redirige les échecs de connexion vers / avec ?error=… : sans ce
//  garde, le client atterrit MUET sur l'accueil sans comprendre (v2.1.3).
// ═══════════════════════════════════════════════════════════════════════════
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Callback:
    "La connexion n'a pas abouti (erreur technique côté serveur). Réessayez — si cela persiste, utilisez le lien magique email, tout aussi rapide.",
  OAuthCallback:
    "La session Google a expiré en route. Réessayez — l'écran de choix de compte s'affichera à nouveau.",
  OAuthAccountNotLinked:
    "Un compte existe déjà avec cette adresse via une autre méthode. Utilisez le lien magique email pour cette adresse.",
  OAuthSignin: "Google a refusé de démarrer la connexion. Réessayez dans un instant.",
  OAuthCreateAccount:
    "La création de votre compte a échoué. Réessayez — ou utilisez le lien magique email.",
  EmailCreateAccount:
    "La création de votre compte a échoué. Redemandez un lien de connexion.",
  Verification:
    "Ce lien de connexion est expiré ou déjà utilisé. Demandez-en un nouveau — ils sont valables 24 heures.",
  AccessDenied: "Connexion refusée. Contactez le support si vous pensez que c'est une erreur.",
  Configuration:
    "La configuration de connexion est momentanément indisponible. Réessayez dans quelques minutes.",
};

function authErrorMessage(code: string): string {
  return (
    AUTH_ERROR_MESSAGES[code] ??
    "La connexion n'a pas abouti. Réessayez — ou utilisez le lien magique email."
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Zone « compte » du header — bouton Connexion ou menu utilisateur.
// ═══════════════════════════════════════════════════════════════════════════
export function AuthMenu({
  googleEnabled,
  emailEnabled,
}: {
  googleEnabled: boolean;
  emailEnabled: boolean;
}) {
  const { data: session, status } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const errorSignaled = useRef(false);

  // ── Échec de connexion signalé (une seule fois, URL nettoyée ensuite) ──────
  useEffect(() => {
    if (errorSignaled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (!code || !/^[A-Za-z]{3,40}$/.test(code)) return;
    errorSignaled.current = true;
    toast.error(authErrorMessage(code), { duration: 9000 });
    // Nettoyage silencieux : ni ?error ni ?callbackUrl ne restent dans l'URL
    // (évite re-signalement au rafraîchissement et liens partagés bruités).
    params.delete("error");
    params.delete("callbackUrl");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, []);

  const anyMethod = googleEnabled || emailEnabled;

  // Session en cours de lecture : pastille neutre, sans décalage de layout.
  if (status === "loading") {
    return (
      <span
        aria-hidden="true"
        className="hidden h-9 w-9 animate-pulse rounded-full bg-muted sm:block"
      />
    );
  }

  // Connecté → menu utilisateur (avatar, commandes, déconnexion).
  if (session?.user) {
    const name = session.user.name || "Mon compte";
    const initials = name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Compte de ${name} — ouvrir le menu`}
            className="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2.5 transition-colors hover:border-primary/40 hover:shadow-sm sm:pr-3"
          >
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded-full border border-border"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-[11px] font-bold text-white">
                {initials || "B"}
              </span>
            )}
            <span className="hidden max-w-[90px] truncate text-[13px] font-semibold lg:inline">
              {name.split(/\s+/)[0]}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="px-3 py-2.5">
            <p className="truncate text-[13.5px] font-semibold">{name}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {session.user.email ?? "Compte connecté"}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account" className="flex w-full cursor-pointer items-center gap-2 text-[13.5px]">
              <PackageSearch className="h-4 w-4 text-primary" aria-hidden="true" />
              Mes commandes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="flex cursor-pointer items-center gap-2 text-[13.5px] text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Non connecté, aucune méthode configurée → rien (pas de bouton qui échoue).
  if (!anyMethod) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setSignInOpen(true)}
        aria-label="Se connecter à b2bpro.store"
        className="gap-1.5 rounded-full border-primary/40 text-[13px] font-semibold text-primary hover:bg-accent sm:text-[13.5px]"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Se connecter</span>
      </Button>
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        googleEnabled={googleEnabled}
        emailEnabled={emailEnabled}
      />
    </>
  );
}
