"use client";

/**
 * Client HTTP minimal pour les routes /api/admin/* — gestion d'erreur et
 * de session expirée centralisée (redirection vers /admin/login sur 401).
 */

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Session expirée");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error || `Erreur ${res.status} — réessayez`;
    throw new Error(message);
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return handle<T>(res);
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}
