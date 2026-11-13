/**
 * Service worker b2bpro.store (v2.4.0 — PWA installable + notifications).
 *
 * Condition d'installabilité Chrome/Edge/Android : un service worker actif AVEC
 * gestionnaire `fetch`. Stratégies conservatrices (le catalogue est dynamique,
 * servi depuis la base : rien de figé ne peut s'imposer en ligne) :
 *
 *   • Navigations        : réseau d'abord ; repli sur la page en cache, puis
 *                          sur /offline.html si le réseau est coupé.
 *   • Assets statiques   : cache d'abord + revalidation en fond (immuables :
 *                          /_next/static haché, /thumbs, /avatars, /icons…).
 *   • API + admin        : JAMAIS servis depuis le cache (réseau pur).
 *   • Reste (fonts…)     : réseau d'abord, cache en repli.
 *
 * Cycle de vie : install → pré-cache tolérant (une 404 n'annule rien) ;
 * activate → purge des caches obsolètes + clients.claim(). Le bump de VERSION
 * déclenche la prise de contrôle au prochain chargement.
 *
 * v2.4.0 — notifications : `push` (Web Push chiffré VAPID, repli local si le
 * message est vide — test de vie) et `notificationclick` (focus de l'app puis
 * navigation vers l'URL utile du message). Les notifications LOCALES
 * (registration.showNotification, confirmation d'activation) transitent par
 * le même canal visuel.
 */

const VERSION = "b2bpro-v2";
const OFFLINE_URL = "/offline.html";

/** Pré-cache d'install : identité de l'app et repli hors-ligne, rien d'autre. */
const PRECACHE = [
  OFFLINE_URL,
  "/site.webmanifest",
  "/favicon.svg",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // Tolérant : chaque ressource individuellement, un échec n'annule pas
      // l'installation (la ressource retombera sur le réseau).
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Vrai si la requête vise un asset statique (immuable ou rarement modifié). */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/thumbs/") ||
    pathname.startsWith("/avatars/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/img/") ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/logo.svg" ||
    pathname === "/site.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Non-GET, hors origine, API et admin : réseau pur, le SW s'efface.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  // Navigations : réseau d'abord (contenu dynamique toujours frais), repli
  // sur la dernière copie en cache puis sur la page hors-ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(req, { ignoreSearch: true });
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets statiques : cache d'abord + revalidation en fond (stale-while-revalidate).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(VERSION).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })(),
    );
    return;
  }

  // Reste (fonts locales, images optimisées…) : réseau d'abord, cache en repli.
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })(),
  );
});

/* ══ Notifications (v2.4.0) ═════════════════════════════════════════════════ */

/** Charge utile Web Push : { title, body, url, tag } (repli : message brut). */
function parsePayload(data) {
  const fallback = {
    title: "b2bpro.store",
    body: "Nouvelle activité sur votre espace.",
    url: "/",
    tag: "b2bpro-push",
  };
  if (!data) return fallback;
  try {
    const parsed = data.json();
    return {
      title: typeof parsed.title === "string" && parsed.title ? parsed.title : fallback.title,
      body: typeof parsed.body === "string" && parsed.body ? parsed.body : fallback.body,
      url: typeof parsed.url === "string" && parsed.url ? parsed.url : fallback.url,
      tag: typeof parsed.tag === "string" && parsed.tag ? parsed.tag : fallback.tag,
    };
  } catch {
    return fallback;
  }
}

/** Message push entrant : affiche la notification, même onglet fermé. */
self.addEventListener("push", (event) => {
  const payload = parsePayload(event.data);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/maskable-192.png",
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

/** Clic sur une notification : focalise l'app existante (ou l'ouvre) et navigue. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Fenêtre déjà ouverte : on la met devant et on navigue vers l'utile.
      for (const client of clientsArr) {
        const url = new URL(client.url).pathname;
        if ("focus" in client && (url === "/" || url.startsWith("/"))) {
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* navigation refusée (contrainte de scope) : focus seul */
            }
          }
          return client.focus();
        }
      }
      // Aucune fenêtre : on en ouvre une sur la destination utile.
      return self.clients.openWindow(target);
    })(),
  );
});
