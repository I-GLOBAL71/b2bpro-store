import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, name, source } = await req.json();
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    const lead = await db.lead.upsert({
      where: { email: email.toLowerCase().trim() },
      update: name ? { name } : {},
      create: {
        email: email.toLowerCase().trim(),
        name: typeof name === "string" ? name : null,
        source: typeof source === "string" ? source : "divers",
      },
    });
    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e) {
    console.error("POST /api/leads", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
