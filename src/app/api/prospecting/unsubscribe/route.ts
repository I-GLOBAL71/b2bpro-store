import { NextRequest, NextResponse } from "next/server";
import { EMAIL_RE } from "@/lib/contracts";
import { addBrevoBlockedContact } from "@/lib/prospecting/brevo-sender";
import { addOptoutEmail, appendHistoryJsonl } from "@/lib/prospecting/store";
import {
  normalizeEmail,
  unsubscribeRequestSchema,
  verifyUnsubscribeToken,
} from "@/lib/prospecting/types";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e")?.trim() || "";
  const token = req.nextUrl.searchParams.get("t")?.trim() || "";

  if (!EMAIL_RE.test(email) || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json(
      { error: "Confirmation manuelle requise", email: normalizeEmail(email) },
      { status: 400 },
    );
  }

  const clean = normalizeEmail(email);
  await addOptoutEmail(clean);
  await addBrevoBlockedContact(clean);
  appendHistoryJsonl({ event: "optout_one_click", email: clean });

  return NextResponse.json({ ok: true, email: clean, status: "unsubscribed" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = unsubscribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Adresse e-mail invalide" },
        { status: 400 },
      );
    }

    const clean = normalizeEmail(parsed.data.email);
    await addOptoutEmail(clean);
    await addBrevoBlockedContact(clean);
    appendHistoryJsonl({ event: "optout_manual", email: clean });

    return NextResponse.json({ ok: true, email: clean, status: "unsubscribed" });
  } catch (e) {
    console.error("POST /api/prospecting/unsubscribe", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
