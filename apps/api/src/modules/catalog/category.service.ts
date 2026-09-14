import { Injectable } from "@nestjs/common";
import type { CategoryNode } from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { RedisService } from "../../common/redis/redis.service.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Category tree, market-scoped. Counts reflect only products the market
   * actually sells, so the UK site never shows "Vadam (59)" if it stocks four.
   */
  async tree(market: ResolvedMarket): Promise<CategoryNode[]> {
    const cacheKey = `catalog:categories:${market.id}`;
    const cached = await this.redis.getJson<CategoryNode[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        products: {
          where: {
            product: {
              isActive: true,
              deletedAt: null,
              marketProducts: { some: { marketId: market.id, isActive: true } },
            },
          },
          select: { productId: true },
        },
      },
    });

    const nodes = new Map<string, CategoryNode & { parentId: string | null }>();
    for (const c of categories) {
      nodes.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c.products.length,
        children: [],
        parentId: c.parentId,
      });
    }

    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const { parentId, ...rest } = node;
      const parent = parentId ? nodes.get(parentId) : undefined;
      if (parent) parent.children.push(rest as CategoryNode);
      else roots.push(rest as CategoryNode);
    }

    // A parent's count includes its children's products.
    const rollUp = (n: CategoryNode): number => {
      n.productCount += n.children.reduce((sum, child) => sum + rollUp(child), 0);
      return n.productCount;
    };
    roots.forEach(rollUp);

    await this.redis.setJson(cacheKey, roots, 300);
    return roots;
  }

  async invalidate(marketId?: string): Promise<void> {
    if (marketId) await this.redis.client.del(`catalog:categories:${marketId}`);
    else await this.redis.delByPrefix("catalog:categories:");
  }
}
