import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  productListQuerySchema, type CategoryNode, type Paginated,
  type ProductDetail, type ProductListQuery, type ProductSummary,
} from "@mb/contracts";
import { zodPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Public } from "../../common/auth/public.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";
import { CategoryService } from "./category.service.js";
import { ProductService } from "./product.service.js";

@Controller("catalog")
export class CatalogController {
  constructor(
    private readonly categories: CategoryService,
    private readonly products: ProductService,
  ) {}

  @Public()
  @Get("categories")
  async categoryTree(@CurrentMarket() market: ResolvedMarket): Promise<CategoryNode[]> {
    return this.categories.tree(market);
  }

  @Public()
  @Get("products")
  async list(
    @CurrentMarket() market: ResolvedMarket,
    @Query(zodPipe(productListQuerySchema)) query: ProductListQuery,
  ): Promise<Paginated<ProductSummary>> {
    return this.products.list(market, query);
  }

  @Public()
  @Get("products/:slug")
  async detail(
    @CurrentMarket() market: ResolvedMarket,
    @Param("slug") slug: string,
  ): Promise<ProductDetail> {
    return this.products.detail(market, slug);
  }
}
