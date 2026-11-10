"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Send, ShieldCheck, Sparkles, Mail, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quel service pour surveiller les prix de mes concurrents ?",
  "Comment fonctionne la préparation d'une base de connaissances IA ?",
  "Quels sont vos délais et garanties de remboursement ?",
  "Je cherche des leads B2B dans le BTP, c'est possible ?",
];

export function SupportChat({ welcome }: { welcome?: string }) {
  const [email, setEmail] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [gated, setGated] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Message d'accueil configurable (panneau admin → Support IA). */
  const welcomeMessage =
    welcome ||
    "Bonjour et bienvenue sur b2bpro.store ! 👋 Comment puis-je vous aider aujourd'hui ?";

  useEffect(() => {
    // Restaure la session précédente
    const saved = sessionStorage.getItem("b2bpro-support-email");
    if (saved) {
      setEmail(saved);
      setGated(true);
      const hist = sessionStorage.getItem("b2bpro-support-history");
      if (hist) {
        try {
          setMessages(JSON.parse(hist));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (gated) sessionStorage.setItem("b2bpro-support-history", JSON.stringify(messages));
  }, [messages, gated]);

  async function passGate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Veuillez saisir un email valide pour activer le support IA.");
      return;
    }
    setGateLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "support-ia" }),
      });
      if (!res.ok) throw new Error();
      sessionStorage.setItem("b2bpro-support-email", email);
      setGated(true);
      setMessages([
        {
          role: "assistant",
          content: welcomeMessage,
        },
      ]);
      toast.success("Support IA activé ! Vos réponses arrivent instantanément.");
    } catch {
      toast.error("Activation impossible pour le moment. Réessayez.");
    } finally {
      setGateLoading(false);
    }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          history: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { reply: string };
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Je rencontre un souci technique momentané. Merci de réessayer dans quelques secondes, ou de reformuler votre question. Notre équipe humaine prend aussi le relais sur demande.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    sessionStorage.removeItem("b2bpro-support-history");
    setMessages([
      {
        role: "assistant",
        content: "Nouvelle conversation initialisée. Quelle est votre question ?",
      },
    ]);
  }

  if (!gated) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-primary/10 blur-xl" aria-hidden="true" />
          <Image
            src="/img/support-ia.png"
            alt="Illustration du support IA b2bpro.store"
            width={96}
            height={96}
            className="relative h-24 w-24 rounded-3xl border border-border shadow-md"
          />
        </div>
        <div>
          <h2 className="flex items-center justify-center gap-2 text-xl font-extrabold">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Activez votre conseiller IA
          </h2>
          <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
            Indiquez votre email pour démarrer la conversation. Il vous permet de retrouver
            l'historique de vos conseils et de recevoir la synthèse de vos échanges : aucune
            autre utilisation, aucune prospection indésirable.
          </p>
        </div>
        <form onSubmit={passGate} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              aria-label="Votre adresse email"
              className="h-11 pl-10"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={gateLoading}
            className="h-11 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-5 font-bold text-white"
          >
            {gateLoading ? "…" : "Démarrer"}
          </Button>
        </form>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Email utilisé uniquement pour votre suivi, 0 spam, conformité RGPD.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[640px] max-h-[75vh] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* En-tête */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-stone-950 to-stone-900 px-5 py-4 text-white">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Sparkles className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-stone-950 bg-emerald-400 animate-pulse-soft" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold">Conseiller IA b2bpro.store</p>
          <p className="text-[11.5px] text-stone-400">En ligne · répond instantanément · connaît tout le catalogue</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetChat}
          aria-label="Réinitialiser la conversation"
          className="text-stone-400 hover:bg-stone-800 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="dark-scroll flex-1 space-y-4 overflow-y-auto bg-muted/30 p-5" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13.5px] leading-6 shadow-sm",
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border bg-card text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5 shadow-sm">
              <span className="typing-dot h-2 w-2 rounded-full bg-primary/70" />
              <span className="typing-dot h-2 w-2 rounded-full bg-primary/70" />
              <span className="typing-dot h-2 w-2 rounded-full bg-primary/70" />
              <span className="ml-2 text-[12px] text-muted-foreground">Le conseiller IA rédige…</span>
            </div>
          </div>
        )}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border bg-card p-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre question… (Entrée pour envoyer)"
          aria-label="Votre message au support IA"
          className="h-11 flex-1 rounded-full"
          maxLength={800}
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Envoyer le message"
          className="h-11 w-11 rounded-full bg-gradient-to-r from-primary to-emerald-500 p-0 text-white"
        >
          <Send className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>
      </form>
      <p className="border-t border-border bg-muted/40 px-5 py-2 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Réponses générées à partir de notre base de connaissances certifiée · un conseiller humain
        peut prendre le relais à tout moment
      </p>
    </div>
  );
}
