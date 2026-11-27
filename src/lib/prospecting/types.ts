/**
 * Contrats, schémas Zod et jetons RGPD du moteur de prospection B2B autonome.
 * b2bpro.store — Architecture additive sans modification du schéma Prisma.
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { EMAIL_RE } from "@/lib/contracts";
import { getSiteUrl } from "@/lib/env";

export const PROSPECTING_KEYS = {
  CONFIG: "prospecting:config",
  LEDGER: "prospecting:ledger",
  OPTOUT: "prospecting:optout",
  SOCIAL: "prospecting:social",
} as const;

export const PROSPECT_STATUSES = [
  "audited",
  "emailed",
  "followed_up",
  "optout",
  "bounced",
  "error",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export interface ProspectAuditFinding {
  url: string;
  domain: string;
  statusCode: number;
  ttfbMs: number;
  title: string;
  metaDescriptionLength: number;
  hasLlmsTxt: boolean;
  hasJsonLd: boolean;
  hasOpenGraph: boolean;
  hasH1: boolean;
  issues: string[];
  summaryLine: string;
}

export interface ProspectRecord {
  id: string;
  siren: string;
  companyName: string;
  city: string;
  department: string;
  domain: string;
  websiteUrl: string;
  email: string;
  poleSlug: string;
  serviceSlug: string;
  serviceTitle: string;
  servicePrice: number;
  status: ProspectStatus;
  findings: ProspectAuditFinding;
  lastSubject?: string;
  brevoMessageId?: string;
  emailedAt?: string;
  followedUpAt?: string;
  updatedAt: string;
  error?: string;
}

export interface ProspectingConfig {
  enabled: boolean;
  dailyEmailCap: number;
  dailyDevtoCap: number;
  followupDelayDays: number;
  senderFullName: string;
  senderRole: string;
  senderCity: string;
  searchCursor: number;
}

export interface SocialSyndicationRecord {
  id: string;
  platform: "devto";
  blogSlug: string;
  title: string;
  externalUrl: string;
  externalId: string;
  canonicalUrl: string;
  publishedAt: string;
}

export interface SocialKitPost {
  id: string;
  channel: "linkedin" | "x" | "facebook" | "whatsapp";
  label: string;
  serviceSlug: string;
  serviceTitle: string;
  content: string;
  generatedAt: string;
}

export interface SocialState {
  posts: SocialSyndicationRecord[];
  kit: SocialKitPost[];
}

export interface WavePreviewSample {
  companyName: string;
  email: string;
  domain: string;
  serviceSlug: string;
  subject: string;
  textBody: string;
  issues: string[];
}

export interface WaveRunSummary {
  wave: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  emailsSentToday: number;
  dailyEmailCap: number;
  newAudited: number;
  initialSent: number;
  followupsSent: number;
  devtoPublished: SocialSyndicationRecord | null;
  errors: string[];
  previewSamples: WavePreviewSample[];
}

export function defaultProspectingConfig(): ProspectingConfig {
  const capRaw = Number(process.env.PROSPECTING_DAILY_EMAIL_CAP ?? "15");
  const dailyEmailCap = Number.isFinite(capRaw)
    ? Math.min(280, Math.max(1, Math.round(capRaw)))
    : 15;

  return {
    enabled: true,
    dailyEmailCap,
    dailyDevtoCap: 1,
    followupDelayDays: 3,
    senderFullName: process.env.PROSPECTING_SENDER_NAME?.trim() || "Thomas Laurent",
    senderRole: process.env.PROSPECTING_SENDER_ROLE?.trim() || "Pôle Audit & Croissance B2B",
    senderCity: process.env.PROSPECTING_SENDER_CITY?.trim() || "Lyon, France",
    searchCursor: 0,
  };
}

export const prospectingConfigPatchSchema = z.object({
  enabled: z.boolean().optional(),
  dailyEmailCap: z.coerce.number().int().min(1).max(280).optional(),
  dailyDevtoCap: z.coerce.number().int().min(0).max(5).optional(),
  followupDelayDays: z.coerce.number().int().min(1).max(14).optional(),
  senderFullName: z.string().trim().min(2).max(80).optional(),
  senderRole: z.string().trim().min(2).max(100).optional(),
  senderCity: z.string().trim().min(2).max(80).optional(),
  searchCursor: z.coerce.number().int().min(0).max(100000).optional(),
});

export const manualProspectAddSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_prospect"),
    websiteUrl: z
      .string()
      .trim()
      .min(4)
      .max(200)
      .refine((v) => /^https?:\/\//i.test(v) || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v), {
        message: "Adresse de site web invalide",
      }),
    email: z.string().trim().regex(EMAIL_RE, "Email invalide").optional(),
    companyName: z.string().trim().min(2).max(120).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    poleSlug: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("add_optout"),
    email: z.string().trim().regex(EMAIL_RE, "Email invalide"),
  }),
]);

export const prospectingWaveRunSchema = z.object({
  wave: z.string().trim().min(1).max(40).default("manuel"),
  emailLimit: z.coerce.number().int().min(1).max(50).default(10),
  dryRun: z.boolean().default(false),
  skipSocial: z.boolean().default(false),
});

export const unsubscribeRequestSchema = z.object({
  email: z.string().trim().regex(EMAIL_RE, "Adresse e-mail invalide"),
  token: z.string().trim().optional(),
});

function unsubscribeSecret(): string {
  const explicit = process.env.PROSPECTING_UNSUB_SECRET?.trim();
  if (explicit) return explicit;
  return createHash("sha256")
    .update("b2bpro::store::rgpd-unsub::v1")
    .digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", unsubscribeSecret())
    .update(normalizeEmail(email))
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const cleanEmail = normalizeEmail(email);
  const cleanToken = token.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || !/^[a-f0-9]{32}$/.test(cleanToken)) {
    return false;
  }
  const expected = signUnsubscribeToken(cleanEmail);
  const a = Buffer.from(cleanToken, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(email: string, siteUrl?: string): string {
  const base = (siteUrl || getSiteUrl()).replace(/\/+$/, "");
  const clean = normalizeEmail(email);
  const token = signUnsubscribeToken(clean);
  return `${base}/desinscription?e=${encodeURIComponent(clean)}&t=${token}`;
}

export function sanitizeNoEmDash(input: string): string {
  return input
    .replace(/\u2014/g, ",")
    .replace(/\u2013/g, "-")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",");
}
