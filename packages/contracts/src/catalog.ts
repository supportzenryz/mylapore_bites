import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

export const stockModeSchema = z.enum([
  "STOCKED",
  "FRESH_PREORDER",
  "LIMITED_DAILY",
  "PREORDER_ONLY",
]);
export type StockModeValue = z.infer<typeof stockModeSchema>;

export const productListQuerySchema = paginationQuerySchema.extend({
  category: z.string().optional(),
  q: z.string().min(1).max(80).optional(),
  featured: z.coerce.boolean().optional(),
  bestseller: z.coerce.boolean().optional(),
  stockMode: stockModeSchema.optional(),
  sort: z.enum(["popular", "price_asc", "price_desc", "newest"]).default("popular"),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const categoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    productCount: z.number().int(),
    children: z.array(categoryNodeSchema),
  }),
);
export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface VariantSummary {
  id: string;
  sku: string;
  name: string;
  packSize: string;
  unit: string;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  /** Null when the variant needs no production (STOCKED). */
  preOrder: {
    leadTimeDays: number;
    cutoffTime: string;
    deliveryWeekdays: number[];
    minOrderQty: number;
    maxOrderQty: number;
  } | null;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  stockMode: StockModeValue;
  freshnessNote: string | null;
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
  fromPrice: string;
  currency: string;
  variantCount: number;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  brand: string;
  ingredients: string | null;
  allergens: string[];
  nutrition: Record<string, unknown> | null;
  storageInstructions: string | null;
  countryOfOrigin: string;
  images: { url: string; altText: string | null }[];
  categories: { slug: string; name: string }[];
  variants: VariantSummary[];
  rating: { average: number; count: number } | null;
}
