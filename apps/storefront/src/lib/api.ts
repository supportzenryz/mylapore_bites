import { headers } from "next/headers";
import type {
  CategoryNode, MarketView, Paginated, ProductDetail, ProductSummary,
} from "@mb/contracts";

const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:4000/v1";

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

export interface HomeContent {
  hero: { headline: string; subhead: string; primaryCta: string; secondaryCta: string };
  settings: Record<string, unknown>;
}

/**
 * Server-side fetch. The public hostname travels to the API as X-Market-Host
 * so the API resolves the market — the browser never picks it.
 */
async function api<T>(path: string, revalidate = 60): Promise<T> {
  const h = await headers();
  const host = h.get("x-market-host") ?? h.get("host") ?? "";

  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", "X-Market-Host": host },
    next: { revalidate },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new ApiError(body.code ?? "INTERNAL", body.message ?? "Something went wrong", res.status);
  }
  return (await res.json()) as T;
}

export const getMarket = () => api<MarketView>("/markets/current", 300);
export const getHomeContent = () => api<HomeContent>("/content/home", 300);
export const getCategories = () => api<CategoryNode[]>("/catalog/categories", 300);
export const getProducts = (qs = "") => api<Paginated<ProductSummary>>(`/catalog/products${qs}`);
export const getProduct = (slug: string) => api<ProductDetail>(`/catalog/products/${slug}`);

/** Search is not cached — a customer typing expects live answers. */
export const searchProducts = (q: string) =>
  api<Paginated<ProductSummary>>(`/catalog/products?q=${encodeURIComponent(q)}&limit=24`, 0);
