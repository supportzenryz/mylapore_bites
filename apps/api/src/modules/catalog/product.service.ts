import { Injectable } from "@nestjs/common";
import { Prisma } from "@mb/database";
import {
  ErrorCode, type Paginated, type ProductDetail, type ProductListQuery,
  type ProductSummary, type VariantSummary,
} from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { DomainError } from "../../common/errors/domain.error.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cursor pagination throughout — offset pagination silently skips or repeats
   * rows when the catalogue changes mid-scroll.
   */
  async list(market: ResolvedMarket, query: ProductListQuery): Promise<Paginated<ProductSummary>> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      marketProducts: { some: { marketId: market.id, isActive: true } },
      ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
      ...(query.featured ? { isFeatured: true } : {}),
      ...(query.bestseller ? { isBestseller: true } : {}),
      ...(query.stockMode ? { stockMode: query.stockMode } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { shortDescription: { contains: query.q, mode: "insensitive" } },
              { variants: { some: { sku: { contains: query.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const orderBy = this.orderFor(query.sort);
    const take = query.limit + 1;

    const rows = await this.prisma.product.findMany({
      where,
      orderBy,
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: this.summaryInclude(market.id),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: page.map((p) => this.toSummary(p, market)),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async detail(market: ResolvedMarket, slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null,
        marketProducts: { some: { marketId: market.id, isActive: true } },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: { select: { slug: true, name: true } } } },
        variants: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            productionRule: true,
            marketVariants: {
              where: { isActive: true, marketProduct: { marketId: market.id } },
            },
          },
        },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    });

    if (!product) {
      throw new DomainError(ErrorCode.NOT_FOUND, "We couldn't find that product.");
    }

    const variants: VariantSummary[] = product.variants
      .filter((v) => v.marketVariants.length > 0)
      .map((v) => {
        const mv = v.marketVariants[0]!;
        return {
          id: v.id,
          sku: v.sku,
          name: v.name,
          packSize: v.packSize.toString(),
          unit: v.unit,
          price: mv.price.toString(),
          compareAtPrice: mv.compareAtPrice?.toString() ?? null,
          currency: market.currency,
          // Null for STOCKED items: nothing to pre-order, no capacity to hold.
          preOrder:
            product.stockMode === "STOCKED" || !v.productionRule
              ? null
              : {
                  leadTimeDays: v.productionRule.leadTimeDays,
                  cutoffTime: v.productionRule.cutoffTime,
                  deliveryWeekdays: v.productionRule.deliveryWeekdays,
                  minOrderQty: v.productionRule.minOrderQty,
                  maxOrderQty: v.productionRule.maxOrderQty,
                },
        };
      });

    if (variants.length === 0) {
      throw new DomainError(ErrorCode.PRODUCT_UNAVAILABLE, "This product isn't available in your area yet.");
    }

    const ratings = product.reviews.map((r) => r.rating);
    const thumbnail = product.images.find((i) => i.isThumbnail) ?? product.images[0];

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      brand: product.brand,
      thumbnailUrl: thumbnail?.url ?? null,
      stockMode: product.stockMode,
      freshnessNote: product.freshnessNote,
      isFeatured: product.isFeatured,
      isBestseller: product.isBestseller,
      isNew: product.isNew,
      fromPrice: variants
        .map((v) => Number(v.price))
        .reduce((min, p) => Math.min(min, p), Number.POSITIVE_INFINITY)
        .toFixed(2),
      currency: market.currency,
      variantCount: variants.length,
      ingredients: product.ingredients,
      allergens: Array.isArray(product.allergens) ? (product.allergens as string[]) : [],
      nutrition: (product.nutrition as Record<string, unknown> | null) ?? null,
      storageInstructions: product.storageInstructions,
      countryOfOrigin: product.countryOfOrigin,
      images: product.images.map((i) => ({ url: i.url, altText: i.altText })),
      categories: product.categories.map((c) => c.category),
      variants,
      rating: ratings.length
        ? { average: Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)), count: ratings.length }
        : null,
    };
  }

  private summaryInclude(marketId: string) {
    return {
      images: { where: { isThumbnail: true }, take: 1 },
      variants: {
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: "asc" as const },
        include: {
          marketVariants: { where: { isActive: true, marketProduct: { marketId } } },
        },
      },
    };
  }

  private orderFor(sort: ProductListQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case "newest":     return [{ createdAt: "desc" }, { id: "desc" }];
      case "price_asc":  return [{ name: "asc" }, { id: "asc" }];
      case "price_desc": return [{ name: "desc" }, { id: "desc" }];
      default:           return [{ isBestseller: "desc" }, { isFeatured: "desc" }, { id: "asc" }];
    }
  }

  private toSummary(
    p: Prisma.ProductGetPayload<{ include: ReturnType<ProductService["summaryInclude"]> }>,
    market: ResolvedMarket,
  ): ProductSummary {
    const prices = p.variants
      .flatMap((v) => v.marketVariants.map((mv) => Number(mv.price)))
      .filter((n) => Number.isFinite(n));

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      thumbnailUrl: p.images[0]?.url ?? null,
      stockMode: p.stockMode,
      freshnessNote: p.freshnessNote,
      isFeatured: p.isFeatured,
      isBestseller: p.isBestseller,
      isNew: p.isNew,
      fromPrice: prices.length ? Math.min(...prices).toFixed(2) : "0.00",
      currency: market.currency,
      variantCount: p.variants.filter((v) => v.marketVariants.length > 0).length,
    };
  }
}
