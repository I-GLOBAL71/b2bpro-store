import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { runAutonomousProspectingWave } from "@/lib/prospecting/engine";
import { prospectingWaveRunSchema } from "@/lib/prospecting/types";

export async function POST(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = prospectingWaveRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Paramètres invalides" },
        { status: 400 },
      );
    }

    const summary = await runAutonomousProspectingWave(parsed.data);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("POST /api/admin/prospecting/run", e);
    return NextResponse.json({ error: "Erreur lors du lancement" }, { status: 500 });
  }
}
