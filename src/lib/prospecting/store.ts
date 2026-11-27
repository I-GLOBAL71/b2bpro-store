/**
 * Persistance additive sur `SiteConfig` (sans migration Prisma) + synchronisation
 * des désinscriptions depuis Neon PostgreSQL + archive JSONL locale.
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { Client } from "pg";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/contracts";
import {
  PROSPECTING_KEYS,
  defaultProspectingConfig,
  normalizeEmail,
  type ProspectRecord,
  type ProspectingConfig,
  type SocialState,
} from "@/lib/prospecting/types";

const MAX_LEDGER_RECORDS = 400;
const MAX_SOCIAL_POSTS = 150;

function stripQueryParams(url: string, params: string[]): string {
  const idx = url.indexOf("?");
  if (idx === -1) return url;
  const kept = url
    .slice(idx + 1)
    .split("&")
    .filter(Boolean)
    .filter((pair) => !params.some((p) => pair.startsWith(`${p}=`)));
  return kept.length ? `${url.slice(0, idx)}?${kept.join("&")}` : url.slice(0, idx);
}

async function readConfigJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.siteConfig.findUnique({ where: { key } });
    if (!row) return fallback;
    return safeJsonParse<T>(row.value, fallback);
  } catch {
    return fallback;
  }
}

async function writeConfigJson(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  await db.siteConfig.upsert({
    where: { key },
    update: { value: serialized },
    create: { key, value: serialized },
  });
}

export async function getProspectingConfig(): Promise<ProspectingConfig> {
  const base = defaultProspectingConfig();
  const stored = await readConfigJson<Partial<ProspectingConfig>>(PROSPECTING_KEYS.CONFIG, {});
  return { ...base, ...stored };
}

export async function saveProspectingConfig(
  patch: Partial<ProspectingConfig>,
): Promise<ProspectingConfig> {
  const current = await getProspectingConfig();
  const next: ProspectingConfig = { ...current, ...patch };
  await writeConfigJson(PROSPECTING_KEYS.CONFIG, next);
  return next;
}

export async function getProspectLedger(): Promise<ProspectRecord[]> {
  const rows = await readConfigJson<ProspectRecord[]>(PROSPECTING_KEYS.LEDGER, []);
  return Array.isArray(rows) ? rows : [];
}

export async function saveProspectLedger(records: ProspectRecord[]): Promise<ProspectRecord[]> {
  const sorted = [...records]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_LEDGER_RECORDS);
  await writeConfigJson(PROSPECTING_KEYS.LEDGER, sorted);
  return sorted;
}

export async function upsertProspectRecord(record: ProspectRecord): Promise<ProspectRecord[]> {
  const existing = await getProspectLedger();
  const cleanEmail = normalizeEmail(record.email);
  const filtered = existing.filter(
    (item) => normalizeEmail(item.email) !== cleanEmail && item.domain !== record.domain,
  );
  return saveProspectLedger([{ ...record, email: cleanEmail }, ...filtered]);
}

export async function getOptoutList(): Promise<string[]> {
  const local = await readConfigJson<string[]>(PROSPECTING_KEYS.OPTOUT, []);
  const set = new Set<string>(
    Array.isArray(local) ? local.map(normalizeEmail).filter(Boolean) : [],
  );

  const neonUrl = process.env.NEON_DATABASE_URL?.trim();
  if (neonUrl && /^postgres(ql)?:\/\//.test(neonUrl) && !process.env.VERCEL) {
    const remote = await fetchRemoteNeonOptouts(neonUrl);
    for (const email of remote) set.add(normalizeEmail(email));
    if (remote.length > 0 && set.size > local.length) {
      await writeConfigJson(PROSPECTING_KEYS.OPTOUT, [...set]);
    }
  }

  return [...set];
}

async function fetchRemoteNeonOptouts(rawUrl: string): Promise<string[]> {
  const pgUrl = stripQueryParams(rawUrl, ["channel_binding", "sslmode"]);
  const client = new Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 12_000,
    query_timeout: 12_000,
  });
  client.on("error", () => {});
  try {
    await client.connect();
    const res = await client.query<{ value: string }>(
      'SELECT value FROM "SiteConfig" WHERE key = $1 LIMIT 1',
      [PROSPECTING_KEYS.OPTOUT],
    );
    if (!res.rows[0]?.value) return [];
    const parsed = safeJsonParse<string[]>(res.rows[0].value, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  } finally {
    await client.end().catch(() => {});
  }
}

export async function addOptoutEmail(email: string): Promise<string[]> {
  const clean = normalizeEmail(email);
  const current = await readConfigJson<string[]>(PROSPECTING_KEYS.OPTOUT, []);
  const set = new Set<string>(
    Array.isArray(current) ? current.map(normalizeEmail).filter(Boolean) : [],
  );
  set.add(clean);
  const list = [...set];
  await writeConfigJson(PROSPECTING_KEYS.OPTOUT, list);

  const ledger = await getProspectLedger();
  let changed = false;
  const updatedLedger = ledger.map((row) => {
    if (normalizeEmail(row.email) === clean && row.status !== "optout") {
      changed = true;
      return { ...row, status: "optout" as const, updatedAt: new Date().toISOString() };
    }
    return row;
  });
  if (changed) {
    await saveProspectLedger(updatedLedger);
  }
  return list;
}

export async function getSocialState(): Promise<SocialState> {
  const state = await readConfigJson<SocialState>(PROSPECTING_KEYS.SOCIAL, {
    posts: [],
    kit: [],
  });
  return {
    posts: Array.isArray(state.posts) ? state.posts : [],
    kit: Array.isArray(state.kit) ? state.kit : [],
  };
}

export async function saveSocialState(state: SocialState): Promise<SocialState> {
  const normalized: SocialState = {
    posts: state.posts.slice(0, MAX_SOCIAL_POSTS),
    kit: state.kit.slice(0, 12),
  };
  await writeConfigJson(PROSPECTING_KEYS.SOCIAL, normalized);
  return normalized;
}

export function countEmailsSentToday(ledger: ProspectRecord[]): number {
  const todayParis = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let count = 0;
  for (const r of ledger) {
    if (r.emailedAt) {
      const d = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(r.emailedAt));
      if (d === todayParis) count += 1;
    }
    if (r.followedUpAt) {
      const d = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(r.followedUpAt));
      if (d === todayParis) count += 1;
    }
  }
  return count;
}

export function appendHistoryJsonl(entry: Record<string, unknown>): void {
  if (process.env.VERCEL) return;
  try {
    const dir = path.join(process.cwd(), "data", "prospecting");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "history.jsonl");
    appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, "utf8");
  } catch {
    // Non bloquant en environnement lecture seule
  }
}

export async function requeuePausedProspects(): Promise<number> {
  const ledger = await getProspectLedger();
  let requeued = 0;
  const nowIso = new Date().toISOString();

  const updated = ledger.map((row) => {
    if (
      row.status === "error" &&
      typeof row.error === "string" &&
      /not yet activated|permission_denied|en pause/i.test(row.error)
    ) {
      requeued += 1;
      return {
        ...row,
        status: "audited" as const,
        error: undefined,
        updatedAt: nowIso,
      };
    }
    return row;
  });

  if (requeued > 0) {
    await saveProspectLedger(updated);
  }
  return requeued;
}

export async function syncProspectingToNeon(): Promise<{
  synced: number;
  error?: string;
}> {
  const neonUrl = process.env.NEON_DATABASE_URL?.trim();
  if (!neonUrl || !/^postgres(ql)?:\/\//.test(neonUrl)) {
    return { synced: 0, error: "NEON_DATABASE_URL absente" };
  }

  const rows = await db.siteConfig.findMany({
    where: { key: { startsWith: "prospecting:" } },
    select: { key: true, value: true },
  });
  if (rows.length === 0) {
    return { synced: 0 };
  }

  const pgUrl = stripQueryParams(neonUrl, ["channel_binding", "sslmode"]);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const client = new Client({
      connectionString: pgUrl,
      ssl: { rejectUnauthorized: false },
      keepAlive: true,
      connectionTimeoutMillis: 25_000,
      query_timeout: 90_000,
    });
    client.on("error", () => {});
    try {
      await client.connect();
      const valuesSql = rows
        .map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2}, NOW())`)
        .join(", ");
      const params: string[] = [];
      for (const row of rows) {
        params.push(row.key, row.value);
      }
      await client.query(
        `INSERT INTO "SiteConfig" ("key", "value", "updatedAt") VALUES ${valuesSql} ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`,
        params,
      );
      return { synced: rows.length };
    } catch (e) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      return {
        synced: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    } finally {
      await client.end().catch(() => {});
    }
  }

  return { synced: 0 };
}
