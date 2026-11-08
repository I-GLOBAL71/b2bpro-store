import Link from "next/link";
import Image from "next/image";
import { Clock, ShoppingCart, Eye } from "lucide-react";
import { RatingStars } from "./rating-stars";
import { formatPrice, formatCompact } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface ServiceCardData {
  slug: string;
  title: string;
  shortDesc: string;
  poleSlug: string;
  category: string;
  basePrice: number;
  deliveryDays: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  sellerName?: string;
  sellerCountry?: string;
  variant?: number; // 0, 1 ou 2 → miniature affichée
  /** Miniatures WebP Vercel Blob (3 URLs absolues) — sinon SVG local par slug. */
  thumbUrls?: string[];
}

export function ServiceCard({
  service,
  className,
}: {
  service: ServiceCardData;
  className?: string;
}) {
  const v = (service.variant ?? 0) % 3;
  const thumbSrc = service.thumbUrls?.[v] ?? `/thumbs/${service.slug}-${v + 1}.svg`;
  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group card-hover flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={thumbSrc}
          alt={`${service.title} — miniature du service`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.045]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {service.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
          {service.title}
        </h3>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <RatingStars rating={service.rating} size={3.25} />
          <span className="font-semibold text-foreground">{service.rating.toString().replace(".", ",")}</span>
          <span>({service.reviewsCount.toLocaleString("fr-FR")})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {service.deliveryDays} jour{service.deliveryDays > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {formatCompact(service.salesCount)} commandes réalisées
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">dès</span>
            <span className="text-lg font-bold text-primary">{formatPrice(service.basePrice)}</span>
          </div>
        </div>
        {service.sellerName && (
          <div className="flex items-center gap-2 border-t border-border pt-2.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {service.sellerName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <span className="truncate font-medium">{service.sellerName}</span>
            {service.sellerCountry && <span className="ml-auto shrink-0 text-[11px]">{service.sellerCountry}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-auto flex justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
