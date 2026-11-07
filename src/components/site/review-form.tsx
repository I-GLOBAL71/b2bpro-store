"use client";

import { useState } from "react";
import { Star, PenLine, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  "France", "Belgique", "Suisse", "Canada (Québec)", "Sénégal", "Côte d'Ivoire",
  "Cameroun", "Maroc", "Tunisie", "RD Congo", "Bénin", "Togo", "Gabon",
  "Burkina Faso", "Mali", "Guinée", "Luxembourg", "Autre",
];

/** Formulaire d'avis — système de notation interne intuitif et convaincant. */
export function ReviewForm({ serviceId }: { serviceId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [country, setCountry] = useState("France");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 15) {
      toast.error("Votre avis doit contenir au moins 15 caractères pour aider les futurs clients.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, authorName, country, rating, comment }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Merci ! Votre avis est publié et aide la communauté francophone.");
    } catch {
      toast.error("Publication impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full border-primary/40 text-primary hover:bg-accent">
          <PenLine className="h-4 w-4" aria-hidden="true" />
          Laisser un avis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Votre avis compte</DialogTitle>
          <DialogDescription>
            Votre retour aide des milliers de clients francophones à choisir en confiance.
            30 secondes suffisent.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-accent/30 p-6 text-center">
            <ThumbsUp className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="text-[15px] font-bold">Avis publié, merci !</p>
            <p className="text-[13px] text-muted-foreground">
              Votre contribution apparaît dès maintenant sur cette page.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Votre note</Label>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Note de 1 à 5 étoiles">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={rating === v}
                    aria-label={`${v} étoile${v > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(v)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(v)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        v <= (hover || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-[14px] font-semibold">
                  {rating.toString().replace(".", ",")}/5
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rv-name">Votre nom / pseudo</Label>
                <Input
                  id="rv-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ex : Marc D."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rv-country">Votre pays</Label>
                <select
                  id="rv-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[13.5px] shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rv-comment">Votre expérience</Label>
              <Textarea
                id="rv-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Qualité du livrable, respect des délais, communication…"
                rows={4}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14px] font-bold text-white"
            >
              {submitting ? "Publication…" : "Publier mon avis"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
