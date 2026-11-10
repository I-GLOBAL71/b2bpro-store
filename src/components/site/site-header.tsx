"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, MessageCircle, ChevronDown, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { POLE_LABELS } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/support", label: "Support IA" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="b2bpro.store : accueil">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 text-[15px] font-black text-white shadow-sm">
            B
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">
            b2bpro<span className="text-primary">.store</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 text-[14px] font-medium">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Catégories
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {Object.entries(POLE_LABELS).map(([slug, label]) => (
                <DropdownMenuItem key={slug} asChild>
                  <Link href={`/categories/${slug}`} className="w-full text-[13.5px]">
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {NAV.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                "text-[14px] font-medium",
                pathname.startsWith(item.href) && "text-primary"
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <form action="/services" className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              name="q"
              placeholder="Rechercher un service…"
              className="h-9 rounded-full border-border/70 bg-muted/60 pl-9 text-[13.5px]"
              aria-label="Rechercher un service"
            />
          </div>
        </form>

        <Button
          asChild
          size="sm"
          className="hidden gap-1.5 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-4 text-[13.5px] font-semibold text-white shadow-sm hover:shadow-md lg:inline-flex"
        >
          <Link href="/services">
            Découvrir les services
          </Link>
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetTitle className="px-1 text-left text-lg font-extrabold">
              b2bpro<span className="text-primary">.store</span>
            </SheetTitle>
            <div className="mt-6 flex flex-col gap-1">
              <form action="/services" className="mb-3" role="search">
                <Input type="search" name="q" placeholder="Rechercher un service…" aria-label="Rechercher un service" />
              </form>
              {NAV.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  asChild
                  className="justify-start text-[15px] font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
              <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                14 pôles d'expertise
              </p>
              <div className="grid grid-cols-1 gap-0.5">
                {Object.entries(POLE_LABELS).map(([slug, label]) => (
                  <Button
                    key={slug}
                    variant="ghost"
                    asChild
                    className="justify-start text-[13.5px] font-normal"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link href={`/categories/${slug}`}>{label}</Link>
                  </Button>
                ))}
              </div>
              <Button
                asChild
                className="mt-5 gap-1.5 rounded-full bg-gradient-to-r from-primary to-emerald-500 font-semibold text-white"
              >
                <Link href="/services" onClick={() => setMobileOpen(false)}>
                  Découvrir les services
                </Link>
              </Button>
              <Button asChild variant="outline" className="mt-2 gap-1.5 rounded-full">
                <Link href="/support" onClick={() => setMobileOpen(false)}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Support IA 7j/7
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
