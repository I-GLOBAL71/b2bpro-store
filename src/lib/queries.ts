import { db } from "@/lib/db";
import { cache } from "react";

export const getStats = cache(async () => {
  const [services, sellers, reviews, blog] = await Promise.all([
    db.service.count(),
    db.seller.count(),
    db.review.count(),
    db.blogPost.count(),
  ]);
  const agg = await db.service.aggregate({
    _avg: { rating: true },
    _sum: { salesCount: true },
  });
  return {
    services,
    sellers,
    reviews,
    blog,
    avgRating: Math.round((agg._avg.rating ?? 4.8) * 10) / 10,
    totalSales: agg._sum.salesCount ?? 0,
  };
});

export const getFeaturedServices = cache(async (limit = 8) => {
  return db.service.findMany({
    where: { featured: true },
    take: limit,
    orderBy: [{ salesCount: "desc" }],
    include: { seller: { select: { name: true, countryLabel: true } } },
  });
});

export const getTopRatedServices = cache(async (limit = 4) => {
  return db.service.findMany({
    take: limit,
    orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }],
    include: { seller: { select: { name: true, countryLabel: true } } },
  });
});

export const getPolesWithCounts = cache(async () => {
  const groups = await db.service.groupBy({
    by: ["poleSlug"],
    _count: { _all: true },
  });
  const map = new Map(groups.map((g) => [g.poleSlug, g._count._all]));
  return map;
});

export const getLatestReviews = cache(async (limit = 6) => {
  return db.review.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }],
    include: {
      service: { select: { title: true, slug: true } },
    },
  });
});

export const getBestReviews = cache(async (limit = 6) => {
  return db.review.findMany({
    where: { rating: { gte: 4.8 } },
    take: limit,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    include: {
      service: { select: { title: true, slug: true } },
    },
  });
});

export const getLatestBlogPosts = cache(async (limit = 3) => {
  return db.blogPost.findMany({
    take: limit,
    orderBy: [{ publishedAt: "desc" }],
  });
});

export const getServiceBySlug = cache(async (slug: string) => {
  return db.service.findUnique({
    where: { slug },
    include: {
      seller: true,
      options: { orderBy: [{ position: "asc" }] },
      reviews: { orderBy: [{ createdAt: "desc" }] },
    },
  });
});

export const getRelatedServices = cache(async (poleSlug: string, excludeId: string, limit = 4) => {
  return db.service.findMany({
    where: { poleSlug, id: { not: excludeId } },
    take: limit,
    orderBy: [{ salesCount: "desc" }],
    include: { seller: { select: { name: true, countryLabel: true } } },
  });
});

export const getSellerBySlug = cache(async (slug: string) => {
  return db.seller.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: [{ salesCount: "desc" }],
        include: { seller: { select: { name: true, countryLabel: true } } },
      },
    },
  });
});

export const getTopSellers = cache(async (limit = 8) => {
  return db.seller.findMany({
    take: limit,
    orderBy: [{ totalSales: "desc" }],
  });
});

export const getServices = cache(
  async ({
    q,
    pole,
    sort,
    page = 1,
    perPage = 24,
    minRating,
    maxPrice,
  }: {
    q?: string;
    pole?: string;
    sort?: string;
    page?: number;
    perPage?: number;
    minRating?: number;
    maxPrice?: number;
  } = {}) => {
    const where: Record<string, unknown> = {};
    if (pole) where.poleSlug = pole;
    if (minRating) where.rating = { gte: minRating };
    if (maxPrice) where.basePrice = { lte: maxPrice };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { name: { contains: q } },
        { category: { contains: q } },
        { shortDesc: { contains: q } },
        { pole: { contains: q } },
      ];
    }
    const orderBy: Record<string, string> =
      sort === "price-asc"
        ? { basePrice: "asc" }
        : sort === "price-desc"
          ? { basePrice: "desc" }
          : sort === "rating"
            ? { rating: "desc" }
            : sort === "reviews"
              ? { reviewsCount: "desc" }
              : { salesCount: "desc" };

    const [total, items] = await Promise.all([
      db.service.count({ where }),
      db.service.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: { seller: { select: { name: true, countryLabel: true } } },
      }),
    ]);
    return { total, items, page, perPage, pages: Math.ceil(total / perPage) };
  }
);
