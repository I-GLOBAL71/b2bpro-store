import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Affichage élégant d'une note étoilée (supporte les demi-étoiles). */
export function RatingStars({
  rating,
  className,
  size = 4,
}: {
  rating: number;
  className?: string;
  size?: number;
}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <Star
          key={i}
          style={{ width: size * 4, height: size * 4 }}
          className="fill-amber-400 text-amber-400"
        />
      );
    } else if (i === full && half) {
      stars.push(
        <span key={i} className="relative inline-flex" style={{ width: size * 4, height: size * 4 }}>
          <Star style={{ width: size * 4, height: size * 4 }} className="text-amber-400" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <StarHalf style={{ width: size * 4, height: size * 4 }} className="fill-amber-400 text-amber-400" />
          </div>
        </span>
      );
    } else {
      stars.push(
        <Star
          key={i}
          style={{ width: size * 4, height: size * 4 }}
          className="text-muted-foreground/25"
        />
      );
    }
  }
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Note : ${rating.toString().replace(".", ",")} sur 5`}>
      {stars}
    </span>
  );
}

/** Note + nombre d'avis, format marketplace. */
export function RatingInline({
  rating,
  reviews,
  className,
}: {
  rating: number;
  reviews?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <RatingStars rating={rating} size={3.5} />
      <span className="font-semibold text-foreground">{rating.toString().replace(".", ",")}</span>
      {reviews !== undefined && (
        <span className="text-muted-foreground">({reviews.toLocaleString("fr-FR")} avis)</span>
      )}
    </span>
  );
}
