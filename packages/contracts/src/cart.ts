import { z } from "zod";

export const addCartItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  /** 0 removes the line. Saves the client a separate delete call. */
  qty: z.number().int().min(0).max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  thumbnailUrl: string | null;
  stockMode: "STOCKED" | "FRESH_PREORDER" | "LIMITED_DAILY" | "PREORDER_ONLY";
  qty: number;
  unitPrice: string;
  lineTotal: string;
  minOrderQty: number;
  maxOrderQty: number;
  /** Present for made-to-order lines so the cart can explain the timing. */
  preOrder: { leadTimeDays: number; cutoffTime: string } | null;
}

export interface CartTotals {
  currency: string;
  subtotal: string;
  tax: string;
  /** Null until a delivery address and date are chosen (Phase 3). */
  deliveryFee: string | null;
  discount: string;
  total: string;
  itemCount: number;
}

export interface CartView {
  id: string;
  lines: CartLine[];
  totals: CartTotals;
  /** Copy for the cart banner, derived from what is actually in the cart. */
  freshnessSummary: string | null;
}
