import { sendNotification, setVapidDetails } from "web-push";

/**
 * push.ts — envoi de notifications Web Push (v2.4.0).
 *
 * Prépare l'envoyeur VAPID une seule fois par processus ; la base fournit les
 * abonnements (modèle PushSubscription). Comportement d'assainissement : un
 * endpoint que le service push du navigateur déclare mort (404/410) est retiré
 * sur-le-champ — la base ne garde que des destinataires vivants.
 *
 * Utilisé par la route de test (/api/push/test) et, à l'avenir, par les flux
 * « votre commande a changé d'état » / « réponse du prestataire » — les
 * notifications restent alors optionnelles : chaque abonné est maître de son
 * sort dans les réglages du navigateur, et le site fonctionne sans elles.
 */

import { db } from "@/lib/db";

export interface PushMessage {
  title: string;
  body: string;
  /** Destination au clic (fiche, compte, accueil…) — le SW navigue vers elle. */
  url?: string;
  /** Regroupement dans le centre de notifications (remplace les soeurs). */
  tag?: string;
}

/** Vrai si VAPID est configuré sur cet environnement. */
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Configure (une fois) l'envoyeur VAPID. Retourne false si non configuré. */
function ensureSender(): boolean {
  if (!pushConfigured()) return false;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@b2bpro.store";
  setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  return true;
}

export interface PushReport {
  sent: number;
  failed: number;
  purged: number;
}

/** Envoie à tous les abonnements vivants ; purge les endpoints morts. */
export async function sendPushToAll(message: PushMessage): Promise<PushReport> {
  const report: PushReport = { sent: 0, failed: 0, purged: 0 };
  if (!ensureSender()) return report;

  const subscriptions = await db.pushSubscription.findMany();
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url ?? "/",
    tag: message.tag ?? "b2bpro-push",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        report.sent += 1;
      } catch (error) {
        const status =
          typeof error === "object" && error && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;
        // 404/410 : l'endpoint n'existe plus côté navigateur → purge immédiate.
        if (status === 404 || status === 410) {
          await db.pushSubscription
            .delete({ where: { endpoint: sub.endpoint } })
            .catch(() => {});
          report.purged += 1;
        } else {
          report.failed += 1;
        }
      }
    }),
  );

  return report;
}
