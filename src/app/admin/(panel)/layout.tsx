import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Layout du panneau d'administration (groupe (panel)).
 * Garde serveur : toute page non authentifiée redirige vers /admin/login
 * (page sœur hors du groupe, donc jamais bloquée par la garde).
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }
  return <AdminShell>{children}</AdminShell>;
}
