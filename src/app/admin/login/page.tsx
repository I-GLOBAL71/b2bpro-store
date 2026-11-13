import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

/**
 * Page de connexion administrateur (v2.5.0 — composant serveur).
 *
 * Garde intelligente : une session admin DÉJÀ valide (cookie signé vivant)
 * n'a rien à faire ici — redirection directe vers le panneau. Le formulaire
 * (composant client) ne s'affiche donc que pour une authentification réelle.
 *
 * L'accès à cette page se fait notamment par le geste discret du header :
 * 7 taps sur le logo de l'application (v2.5.0) → /admin → login si besoin.
 */
export default async function AdminLoginPage() {
  if (await isAdminSession()) {
    redirect("/admin");
  }
  return <AdminLoginForm />;
}
