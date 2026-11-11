import ZAI from "z-ai-web-dev-sdk";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Couche fournisseur LLM unique — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ROUTAGE (v1.10.1 — robustesse anti-panne de production) :
 *   1. DEEPSEEK_API_KEY défini → API DeepSeek (https://api.deepseek.com,
 *      modèle « deepseek-chat », format compatible OpenAI) ;
 *   2. sinon / en cas d'échec → passerelle z-ai (config .z-ai-config —
 *      disponible dans l'environnement de développement uniquement ;
 *      sur Vercel ce fichier n'existe pas, le repli est alors sans effet) ;
 *   3. si les deux échouent → `reply: null` : l'APPELANT sert alors une
 *      réponse de repli DÉTERMINISTE construite sur les données de la fiche.
 *      ⇒ La conversation ne tombe JAMAIS en panne, et la route ne renvoie
 *      plus d'erreur 500 au visiteur (défaut corrigé en v1.10.1).
 *
 *  RÈGLES :
 *   - Réservé au code SERVEUR (routes API, scripts) — jamais de bundle client.
 *   - `generateChatReply` NE LEVE JAMAIS D'EXCEPTION : chaque fournisseur est
 *     enveloppé, les échecs sont journalisés (`console.error`) et mémorisés
 *     pour l'endpoint de diagnostic GET /api/service-chat.
 *   - Timeout DeepSeek resserré (12 s — les fonctions Vercel Hobby sont
 *     coupées à ~10-60 s : il faut pouvoir basculer AVANT l'expiration).
 *   - Les prompts système restent en français, garantis par l'appelant.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatProviderMessage {
  role: ChatRole;
  content: string;
}

export interface ChatReplyOptions {
  /** Créativité du modèle (0 = déterministe). Défaut : 0.7. */
  temperature?: number;
  /** Plafond de tokens générés. Défaut : 500 (réponses courtes). */
  maxTokens?: number;
}

export interface ChatReplyResult {
  /** `null` = tous les fournisseurs ont échoué → l'appelant sert son repli local. */
  reply: string | null;
  provider: "deepseek" | "zai" | "indisponible";
  /** Dernier échec technique (journalisation uniquement — jamais exposé au client). */
  error?: string;
}

/** Endpoint officiel DeepSeek (compatible OpenAI chat/completions). */
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
/**
 * Garde-fou réseau resserré : au-delà, la requête est abandonnée et le
 * fournisseur suivant prend le relais. 12 s laissent le temps à deepseek-chat
 * de produire une réponse courte tout en restant compatible avec les limites
 * des fonctions serverless Vercel.
 */
const DEEPSEEK_TIMEOUT_MS = 12_000;

// ── État de diagnostic (par instance serverless — indicatif) ────────────────
let lastDeepseekError: string | undefined;
let lastZaiError: string | undefined;

function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`.slice(0, 240);
  return String(e).slice(0, 240);
}

function deepSeekApiKey(): string | undefined {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  return key ? key : undefined;
}

/** Nom du fournisseur actif (informatif — exposé dans les réponses API). */
export function activeChatProvider(): "deepseek" | "zai" {
  return deepSeekApiKey() ? "deepseek" : "zai";
}

async function callDeepSeek(
  messages: ChatProviderMessage[],
  opts: ChatReplyOptions
): Promise<string> {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepSeekApiKey()}`,
    },
    body: JSON.stringify({
      model: deepSeekModel(),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 500,
      stream: false,
    }),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek HTTP ${res.status} — ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("DeepSeek : réponse vide");
  return reply;
}

export function deepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
}

async function callZai(
  messages: ChatProviderMessage[],
  opts: ChatReplyOptions
): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    // Le SDK z-ai attend le prompt système au rôle « assistant ».
    messages: messages.map((m) => ({
      role: (m.role === "system" ? "assistant" : m.role) as "assistant" | "user",
      content: m.content,
    })),
    thinking: { type: "disabled" },
  });
  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) throw new Error("z-ai : réponse vide");
  return reply;
}

/**
 * Génère une réponse de chat — routage DeepSeek → z-ai → null.
 * NE LEVE JAMAIS D'EXCEPTION : si les deux fournisseurs échouent, la fonction
 * renvoie `{ reply: null, provider: "indisponible" }` et l'appelant doit servir
 * son propre repli déterministe (construit sur les données de la fiche).
 */
export async function generateChatReply(
  messages: ChatProviderMessage[],
  opts: ChatReplyOptions = {}
): Promise<ChatReplyResult> {
  if (deepSeekApiKey()) {
    try {
      return { reply: await callDeepSeek(messages, opts), provider: "deepseek" };
    } catch (e) {
      lastDeepseekError = describeError(e);
      console.error("[ai-provider] DeepSeek indisponible, repli sur z-ai :", e);
    }
  }

  try {
    return { reply: await callZai(messages, opts), provider: "zai" };
  } catch (e) {
    lastZaiError = describeError(e);
    console.error("[ai-provider] z-ai indisponible, repli local conseillé :", e);
  }

  return {
    reply: null,
    provider: "indisponible",
    error: lastDeepseekError ?? lastZaiError ?? "aucun fournisseur LLM joignable",
  };
}

// ── Diagnostic (GET /api/service-chat) ──────────────────────────────────────
/** La clé DeepSeek commence par « sk- » et ne contient ni espace ni guillemet. */
function deepSeekKeyFormatOk(key: string | undefined): boolean {
  return !!key && /^sk-[A-Za-z0-9_-]{20,}$/.test(key);
}

export interface ChatProviderDiagnostics {
  activeProvider: "deepseek" | "zai" | "aucun";
  deepseek: {
    /** `DEEPSEEK_API_KEY` est-elle visible du processus ? */
    keyPresent: boolean;
    /** Format plausible (préfixe sk-, ni espace ni guillemet, ≥ 20 car.) ? */
    keyFormatOk: boolean;
    model: string;
    timeoutMs: number;
    /** Dernier échec constaté par CETTE instance (journalisé — indicatif). */
    lastError?: string;
  };
  zai: {
    /** Fichier .z-ai-config présent ? (vrai en dev, faux sur Vercel) */
    configPresent: boolean;
    lastError?: string;
  };
}

/** État de la configuration (aucun secret n'est divulgué — que des booléens). */
export async function getChatProviderDiagnostics(): Promise<ChatProviderDiagnostics> {
  const key = deepSeekApiKey();
  let zaiConfigPresent = false;
  try {
    await ZAI.create();
    zaiConfigPresent = true;
  } catch {
    /* fichier .z-ai-config absent ou invalide (attendu sur Vercel) */
  }
  return {
    activeProvider: key ? "deepseek" : zaiConfigPresent ? "zai" : "aucun",
    deepseek: {
      keyPresent: !!key,
      keyFormatOk: deepSeekKeyFormatOk(key),
      model: deepSeekModel(),
      timeoutMs: DEEPSEEK_TIMEOUT_MS,
      ...(lastDeepseekError ? { lastError: lastDeepseekError } : {}),
    },
    zai: {
      configPresent: zaiConfigPresent,
      ...(lastZaiError ? { lastError: lastZaiError } : {}),
    },
  };
}

export interface DeepSeekPingResult {
  ok: boolean;
  /** Statut HTTP renvoyé par l'API DeepSeek (200 attendu). */
  status?: number;
  /** Message d'erreur tronqué (jamais la clé). */
  detail?: string;
}

/**
 * Vérification LIVE de la clé DeepSeek : un ping d'1 token est réellement
 * envoyé à l'API. Résout les trois causes d'échec classiques :
 *   401 = clé invalide · 402 = solde insuffisant · timeout/réseau = flux bloqué.
 */
export async function pingDeepSeek(): Promise<DeepSeekPingResult> {
  if (!deepSeekApiKey()) {
    return { ok: false, detail: "DEEPSEEK_API_KEY absente de l'environnement" };
  }
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepSeekApiKey()}`,
      },
      body: JSON.stringify({
        model: deepSeekModel(),
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return { ok: false, status: res.status, detail };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, detail: describeError(e) };
  }
}
