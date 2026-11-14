"use client";

/**
 * prompt-hub — régisseur d'attention (v2.4.0).
 *
 * Une seule invitation plein écran à la fois : l'invite d'installation de
 * l'App (PwaClient) et l'invite de notifications (NotificationPrompt) s'y
 * coordonnent pour ne JAMAIS spammer le visiteur :
 *
 *   • acquirePrompt(kind) : occupe le créneau d'attention (refuse si pris) ;
 *   • releasePrompt(kind) : libère le créneau et horodate la fermeture ;
 *   • withinSpacing(snapshot) : vrai pendant le délai de courtoisie suivant
 *     TOUTE fermeture : la seconde invitation attend donc, même si ses
 *     propres conditions d'engagement sont déjà réunies.
 *
 * Le hub vit en mémoire (rien n'est persisté) : chaque chargement de l'app
 * repart d'une page blanche, les invitations relisent alors leurs propres
 * règles (sessionStorage pour l'installation, cooldowns escaladants
 * persistés pour les notifications).
 */

import { useSyncExternalStore } from "react";

export type PromptKind = "install" | "notifications";

export interface PromptHubSnapshot {
  /** Invitation actuellement affichée : une seule à la fois, par conception. */
  active: PromptKind | null;
  /** Horodatage (ms) de la fermeture de la dernière invitation. */
  lastClosedAt: number;
  /** Dernière invitation fermée. */
  lastClosedKind: PromptKind | null;
}

/** Délai de courtoisie entre deux invitations (fermeture → relance possible). */
export const PROMPT_SPACING_MS = 60_000;

const listeners = new Set<() => void>();

let snapshot: PromptHubSnapshot = {
  active: null,
  lastClosedAt: 0,
  lastClosedKind: null,
};

function publish(patch: Partial<PromptHubSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export function subscribePromptHub(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPromptHubSnapshot(): PromptHubSnapshot {
  return snapshot;
}

/** Occupe le créneau d'attention ; refuse si une autre invitation l'a pris. */
export function acquirePrompt(kind: PromptKind): boolean {
  if (snapshot.active) return false;
  publish({ active: kind });
  return true;
}

/** Libère le créneau et démarre le délai de courtoisie (fermeture horodatée). */
export function releasePrompt(kind: PromptKind) {
  if (snapshot.active !== kind) return;
  publish({ active: null, lastClosedAt: Date.now(), lastClosedKind: kind });
}

/** Vrai si le délai de courtoisie depuis la dernière fermeture court encore. */
export function withinSpacing(s: PromptHubSnapshot): boolean {
  return Date.now() - s.lastClosedAt < PROMPT_SPACING_MS;
}

/** Hook React : re-rend quand le créneau d'attention change d'état. */
export function usePromptHub(): PromptHubSnapshot {
  return useSyncExternalStore(
    subscribePromptHub,
    getPromptHubSnapshot,
    getPromptHubSnapshot,
  );
}
