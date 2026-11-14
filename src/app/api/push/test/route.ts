import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { pushConfigured, sendPushToAll } from "@/lib/push";

/**
 * POST /api/push/test — notification d'essai, propriétaire uniquement (v2.4.1).
 *
 * Garde `ensureAdmin` (401 sans session administrateur) : l'essai ne sert qu'à
 * vérifier le bout en bout de Web Push après un changement de clés ou de
 * plateforme — jamais un canal de diffusion. Envoie la charge utile de test à
 * TOUS les abonnements vivants et retourne le rapport { sent, failed, purged } :
 * les endpoints que le service push du navigateur déclare morts (404/410) sont
 * purgés par la même occasion — la base ne garde que des destinataires vivants.
 *
 * Sans clés VAPID sur l'environnement : 503 explicite (aucun envoi silencieux).
 * Avec une base vide : { sent: 0, failed: 0, purged: 0 } — tout est câblé, il
 * n'y a simplement personne d'abonné sur CET environnement.
 */
export async function POST() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Web Push non configuré : clés VAPID absentes de l'environnement." },
      { status: 503 },
    );
  }

  try {
    const report = await sendPushToAll({
      title: "Notifications b2bpro.store",
      body: "Test réussi : tout est opérationnel, vous serez alerté à temps.",
      url: "/",
      tag: "b2bpro-push-test",
    });
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    console.error("[/api/push/test]", e);
    return NextResponse.json(
      { error: "Envoi impossible pour le moment." },
      { status: 500 },
    );
  }
}
