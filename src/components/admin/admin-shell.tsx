"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Recycle,
  Home,
  MessageCircle,
  MessagesSquare,
  Settings2,
  Package,
  ScrollText,
  LogOut,
  ExternalLink,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiSend } from "@/components/admin/api";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/messages", label: "Messages clients", icon: MessagesSquare, badge: true },
  { href: "/admin/vitrine", label: "Vitrine & Rotation", icon: Recycle },
  { href: "/admin/accueil", label: "Page d'accueil", icon: Home },
  { href: "/admin/support", label: "Support IA", icon: MessageCircle },
  { href: "/admin/general", label: "Général & SEO", icon: Settings2 },
  { href: "/admin/services", label: "Services", icon: Package },
  { href: "/admin/journal", label: "Journal d'audit", icon: ScrollText },
] as const;

/**
 * Badge « questions clients en attente » (v2.2.0) : interrogé toutes les 45 s
 * (réponse minuscule ?summary=1) + à la reprise de focus. C'est la
 * « notification » visuelle du propriétaire, complément de l'email urgent.
 */
function UnreadMessagesBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = async () => {
      try {
        const res = await fetch("/api/admin/support?summary=1", { cache: "no-store" });
        if (res.status === 401) return;
        const data = (await res.json()) as { unreadTotal?: number };
        if (!cancelled) setUnread(data.unreadTotal ?? 0);
      } catch {
        /* réseau passager — le prochain cycle réessaiera */
      }
    };
    void query();
    const id = setInterval(() => void query(), 45_000);
    const onVisible = () => document.visibilityState === "visible" && void query();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (unread <= 0) return null;
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white"
      aria-label={`${unread} message${unread > 1 ? "s" : ""} client en attente`}
    >
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation administration" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            {item.label}
            {"badge" in item && item.badge && <UnreadMessagesBadge />}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  async function logout() {
    try {
      await apiSend("/api/admin/logout", "POST");
      toast.success("Déconnecté — à bientôt !");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("Déconnexion impossible — réessayez");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-2" onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-[15px] font-black text-white shadow-sm">
          B
        </span>
        <span className="text-[15px] font-extrabold tracking-tight text-white">
          b2bpro<span className="text-emerald-400">.store</span>
          <span className="ml-2 rounded-md bg-stone-800 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Admin
          </span>
        </span>
      </Link>

      <div className="mt-7 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 px-3.5 text-[10.5px] font-bold uppercase tracking-widest text-stone-500">
          Pilotage
        </p>
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-stone-800 pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-stone-400 transition-colors hover:bg-stone-800/60 hover:text-stone-200"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Voir le site public
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium text-stone-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

/** Structure commune du panneau : sidebar sombre (desktop) + drawer (mobile). */
export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-1 bg-muted/40">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-stone-950 p-4 lg:flex">
        <SidebarInner />
      </aside>

      {/* Barre mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ouvrir le menu d'administration">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-stone-950 p-4 text-white">
              <SheetTitle className="sr-only">Menu d&apos;administration</SheetTitle>
              <SidebarInner onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-[15px] font-extrabold tracking-tight">
            b2bpro<span className="text-primary">.store</span>
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Admin
            </span>
          </span>
        </header>

        <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
