/**
 * Mock API — DEVELOPMENT ONLY. Never built into a production image.
 *
 * Serves the same response shapes as the real NestJS API so the storefront can
 * be developed and visually reviewed without PostgreSQL, Prisma or Redis.
 *
 * It imports the SEED catalogue directly rather than keeping its own copy, so
 * it cannot drift from the real data. It is not a substitute for the API: there
 * is no auth, no capacity, no persistence beyond process memory.
 *
 *   pnpm mock:api        # http://localhost:4000/v1
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CATEGORIES, PRODUCTS, type SeedProduct } from "../../packages/database/src/seed/catalogue.js";

const PORT = Number(process.env.MOCK_API_PORT ?? 4000);

/** Stable ids so a page reload doesn't invalidate the cart. */
const idFor = (seed: string): string => {
  const h = createHash("sha256").update(seed).digest("hex");
  return [h.slice(0, 8), h.slice(8, 12), `7${h.slice(13, 16)}`, `8${h.slice(17, 20)}`, h.slice(20, 32)].join("-");
};

const MARKET = {
  code: "IN",
  name: "India",
  currency: "INR",
  currencySymbol: "₹",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
  phoneCountryCode: "+91",
  orderHorizonDays: 21,
  pricesIncludeTax: true,
};

const priceOf = (p: SeedProduct): string =>
  Math.min(...p.variants.map((v) => Number(v.priceInr))).toFixed(2);

const summary = (p: SeedProduct) => ({
  id: idFor(p.slug),
  slug: p.slug,
  name: p.name,
  shortDescription: p.shortDescription,
  thumbnailUrl: null,
  stockMode: p.stockMode,
  freshnessNote: p.freshnessNote ?? null,
  isFeatured: p.isFeatured ?? false,
  isBestseller: p.isBestseller ?? false,
  isNew: p.isNew ?? false,
  fromPrice: priceOf(p),
  currency: MARKET.currency,
  variantCount: p.variants.length,
});

const detail = (p: SeedProduct) => ({
  ...summary(p),
  description: p.description,
  brand: "Mylapore Bites",
  ingredients: p.ingredients ?? null,
  allergens: p.allergens ?? [],
  nutrition: null,
  storageInstructions: p.storageInstructions ?? null,
  countryOfOrigin: "India",
  images: [],
  categories: p.categorySlugs.map((slug) => ({
    slug,
    name: CATEGORIES.find((c) => c.slug === slug)?.name ?? slug,
  })),
  variants: p.variants.map((v) => ({
    id: idFor(v.sku),
    sku: v.sku,
    name: v.name,
    packSize: String(v.packSize),
    unit: v.unit,
    price: Number(v.priceInr).toFixed(2),
    compareAtPrice: null,
    currency: MARKET.currency,
    preOrder: v.production
      ? {
          leadTimeDays: v.production.leadTimeDays,
          cutoffTime: v.production.cutoffTime,
          deliveryWeekdays: v.production.deliveryWeekdays,
          minOrderQty: v.production.minOrderQty,
          maxOrderQty: v.production.maxOrderQty,
        }
      : null,
  })),
  rating: null,
});

/* ------------------------------------------------------------------- cart */
interface MockLine { id: string; variantId: string; qty: number }
const carts = new Map<string, MockLine[]>();

const findVariant = (variantId: string) => {
  for (const p of PRODUCTS) {
    for (const v of p.variants) {
      if (idFor(v.sku) === variantId) return { product: p, variant: v };
    }
  }
  return null;
};

function cartView(token: string) {
  const lines = carts.get(token) ?? [];
  const out = [];
  let subtotalMinor = 0;

  for (const line of lines) {
    const found = findVariant(line.variantId);
    if (!found) continue;
    const { product, variant } = found;
    const unitMinor = Math.round(Number(variant.priceInr) * 100);
    subtotalMinor += unitMinor * line.qty;

    out.push({
      id: line.id,
      variantId: line.variantId,
      productId: idFor(product.slug),
      productSlug: product.slug,
      productName: product.name,
      variantName: variant.name,
      thumbnailUrl: null,
      stockMode: product.stockMode,
      qty: line.qty,
      unitPrice: Number(variant.priceInr).toFixed(2),
      lineTotal: ((unitMinor * line.qty) / 100).toFixed(2),
      minOrderQty: variant.production?.minOrderQty ?? 1,
      maxOrderQty: variant.production?.maxOrderQty ?? 99,
      preOrder: variant.production
        ? { leadTimeDays: variant.production.leadTimeDays, cutoffTime: variant.production.cutoffTime }
        : null,
    });
  }

  // Mirrors the real pricing service: 5% GST extracted from an inclusive price.
  const taxMinor = subtotalMinor - Math.round(subtotalMinor / 1.05);
  const freshCount = out.filter((l) => l.preOrder).length;

  return {
    id: token,
    lines: out,
    totals: {
      currency: MARKET.currency,
      subtotal: ((subtotalMinor - taxMinor) / 100).toFixed(2),
      tax: (taxMinor / 100).toFixed(2),
      deliveryFee: null,
      discount: "0.00",
      total: (subtotalMinor / 100).toFixed(2),
      itemCount: out.reduce((n, l) => n + l.qty, 0),
    },
    freshnessSummary:
      freshCount === 0
        ? null
        : freshCount === out.length
          ? "Everything in your basket is made fresh in Mylapore after you order. Choose a delivery date at checkout."
          : `${freshCount} item${freshCount === 1 ? "" : "s"} in your basket are made fresh after you order, so your delivery date is set by ${freshCount === 1 ? "that item" : "the longest of them"}.`,
  };
}

/* ----------------------------------------------------------------- server */
/**
 * Dev CORS: echo back any localhost origin rather than pinning one port, so
 * running the storefront on a different port doesn't silently break the cart.
 * Never do this in the real API — that one keeps a strict allowlist.
 */
const allowOrigin = (req: IncomingMessage): string => {
  const origin = req.headers.origin;
  if (process.env.MOCK_CORS_ORIGIN) return process.env.MOCK_CORS_ORIGIN;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "http://localhost:3000";
};

const json = (res: ServerResponse, status: number, body: unknown, cookie?: string, req?: IncomingMessage): void => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": req ? allowOrigin(req) : "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Market-Host, X-Market-Code",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
};

const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { return {}; }
};

const cartToken = (req: IncomingMessage): { token: string; isNew: boolean } => {
  const raw = req.headers.cookie ?? "";
  const match = /mb_cart=([^;]+)/.exec(raw);
  if (match?.[1]) return { token: match[1], isNew: false };
  return { token: randomUUID(), isNew: true };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/v1/, "");

  if (req.method === "OPTIONS") return json(res, 204, {}, undefined, req);

  if (path === "/health") return json(res, 200, { status: "ok", mock: true }, undefined, req);

  if (path === "/markets/current") return json(res, 200, MARKET, undefined, req);

  if (path === "/content/home") {
    return json(res, 200, {
      hero: {
        headline: "Made Fresh. From Mylapore. To Your Door.",
        subhead:
          "Traditional South Indian foods prepared fresh in Mylapore and delivered to your home.",
        primaryCta: "Pre-order now",
        secondaryCta: "Explore the menu",
      },
      settings: {},
    }, undefined, req);
  }

  if (path === "/catalog/categories") {
    return json(
      res, 200,
      CATEGORIES.map((c) => ({
        id: idFor(c.slug),
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: null,
        productCount: PRODUCTS.filter((p) => p.categorySlugs.includes(c.slug)).length,
        children: [],
      })),
      undefined, req,
    );
  }

  if (path.startsWith("/catalog/products/")) {
    const slug = path.split("/").pop()!;
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (!product) return json(res, 404, { code: "NOT_FOUND", message: "We couldn't find that product." }, undefined, req);
    return json(res, 200, detail(product), undefined, req);
  }

  if (path === "/catalog/products") {
    const q = url.searchParams.get("q")?.toLowerCase();
    const category = url.searchParams.get("category");
    const stockMode = url.searchParams.get("stockMode");
    const limit = Number(url.searchParams.get("limit") ?? 24);

    let items = PRODUCTS.slice();
    if (category) items = items.filter((p) => p.categorySlugs.includes(category));
    if (stockMode) items = items.filter((p) => p.stockMode === stockMode);
    if (url.searchParams.get("featured") === "true") items = items.filter((p) => p.isFeatured);
    if (url.searchParams.get("bestseller") === "true") items = items.filter((p) => p.isBestseller);
    if (q) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(q)),
      );
    }

    return json(res, 200, {
      items: items.slice(0, limit).map(summary),
      nextCursor: null,
      hasMore: items.length > limit,
    }, undefined, req);
  }

  if (path.startsWith("/cart")) {
    const { token, isNew } = cartToken(req);
    const cookie = isNew ? `mb_cart=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` : undefined;
    const lines = carts.get(token) ?? [];

    if (req.method === "GET") return json(res, 200, cartView(token), cookie, req);

    if (req.method === "POST" && path === "/cart/items") {
      const body = await readBody(req);
      const variantId = String(body.variantId ?? "");
      const qty = Number(body.qty ?? 1);
      const found = findVariant(variantId);
      if (!found) {
        return json(res, 400, { code: "PRODUCT_UNAVAILABLE", message: "This product is no longer available." }, cookie, req);
      }
      const max = found.variant.production?.maxOrderQty ?? 99;
      const existing = lines.find((l) => l.variantId === variantId);
      const next = (existing?.qty ?? 0) + qty;
      if (next > max) {
        return json(res, 400, {
          code: "QTY_OUT_OF_RANGE",
          message: `We can make up to ${max} of this per order. For larger quantities, please contact us.`,
          details: { max },
        }, cookie, req);
      }
      if (existing) existing.qty = next;
      else lines.push({ id: randomUUID(), variantId, qty });
      carts.set(token, lines);
      return json(res, 200, cartView(token), cookie, req);
    }

    const itemMatch = /^\/cart\/items\/([^/]+)$/.exec(path);
    if (itemMatch) {
      const itemId = itemMatch[1]!;
      if (req.method === "DELETE") {
        carts.set(token, lines.filter((l) => l.id !== itemId));
        return json(res, 200, cartView(token), cookie, req);
      }
      if (req.method === "PATCH") {
        const body = await readBody(req);
        const qty = Number(body.qty ?? 1);
        carts.set(
          token,
          qty === 0
            ? lines.filter((l) => l.id !== itemId)
            : lines.map((l) => (l.id === itemId ? { ...l, qty } : l)),
        );
        return json(res, 200, cartView(token), cookie, req);
      }
    }
  }

  json(res, 404, { code: "NOT_FOUND", message: "Not found" }, undefined, req);
});

server.listen(PORT, () => {
  console.log(`Mock API (DEV ONLY) on http://localhost:${PORT}/v1`);
  console.log(`  ${PRODUCTS.length} products · ${CATEGORIES.length} categories, read from the seed catalogue`);
});
