import { NextResponse } from "next/server";
import { generateSyndicationRssXml } from "@/lib/prospecting/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await generateSyndicationRssXml();
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
