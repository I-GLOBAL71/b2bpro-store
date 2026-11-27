import type { Metadata } from "next";
import { EMAIL_RE } from "@/lib/contracts";
import { addBrevoBlockedContact } from "@/lib/prospecting/brevo-sender";
import { addOptoutEmail, appendHistoryJsonl } from "@/lib/prospecting/store";
import { normalizeEmail, verifyUnsubscribeToken } from "@/lib/prospecting/types";
import { UnsubscribeBox } from "@/components/site/unsubscribe-box";

export const metadata: Metadata = {
  title: "Désinscription e-mail",
  description: "Retirez votre adresse e-mail de nos notes d'audit B2B en un clic.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DesinscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const params = await searchParams;
  const rawEmail = params.e?.trim() || "";
  const rawToken = params.t?.trim() || "";
  const cleanEmail = EMAIL_RE.test(rawEmail) ? normalizeEmail(rawEmail) : "";

  let autoUnsubscribed = false;
  if (cleanEmail && rawToken && verifyUnsubscribeToken(cleanEmail, rawToken)) {
    await addOptoutEmail(cleanEmail);
    await addBrevoBlockedContact(cleanEmail);
    appendHistoryJsonl({ event: "optout_page_one_click", email: cleanEmail });
    autoUnsubscribed = true;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl px-4 py-12 sm:px-6">
      <UnsubscribeBox initialDone={autoUnsubscribed} initialEmail={cleanEmail} />
    </div>
  );
}
