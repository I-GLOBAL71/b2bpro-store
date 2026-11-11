import ZAI from "z-ai-web-dev-sdk";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Couche fournisseur LLM unique — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ROUTAGE (v1.9.0 — chat IA par service) :
 *   - DEEPSEEK_API_KEY défini  → API DeepSeek (https://api.deepseek.com,
 *     modèle « deepseek-chat », format compatible OpenAI) ;
 *   - sinon / en cas d'échec    → repli sur z-ai-web-dev-sdk (passerelle déjà
 *     utilisée par /api/support/chat).
 *
 *  RÈGLES :
 *   - Réservé au code SERVEUR (routes API, scripts) — jamais de bundle client.
 *   - Timeout strict (30 s) + messages d'erreur contextualisés : l'appelant
 *     peut servir un texte de repli convivial sans jamais pendre la requête.
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
  reply: string;
  provider: "deepseek" | "zai";
}

/** Endpoint officiel DeepSeek (compatible OpenAI chat/completions). */
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
/** Garde-fou réseau : au-delà, la requête est abandonnée et le repli prend le relais. */
const DEEPSEEK_TIMEOUT_MS = 30_000;

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
      model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
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
 * Génère une réponse de chat — routage DeepSeek → repli z-ai.
 * Si DeepSeek échoue (clé invalide, réseau, timeout), la passerelle z-ai
 * prend le relais silencieusement : la conversation ne tombe jamais en panne.
 */
export async function generateChatReply(
  messages: ChatProviderMessage[],
  opts: ChatReplyOptions = {}
): Promise<ChatReplyResult> {
  if (deepSeekApiKey()) {
    try {
      return { reply: await callDeepSeek(messages, opts), provider: "deepseek" };
    } catch (e) {
      console.error("[ai-provider] DeepSeek indisponible, repli sur z-ai :", e);
    }
  }
  return { reply: await callZai(messages, opts), provider: "zai" };
}
