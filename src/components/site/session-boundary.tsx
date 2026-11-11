"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Frontière de session (v2.0.0) — rend SessionProvider (next-auth) disponible
 * pour toute l'application : header (menu compte), tunnel de commande
 * (préremplissage), page /account. Les sessions sont des cookies JWT signés.
 */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
