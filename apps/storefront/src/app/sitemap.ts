import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mylaporebites.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    "", "/shop", "/search", "/how-it-works", "/delivery", "/our-story", "/contact",
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.6 }));

  // A build without a reachable API still produces a valid sitemap.
  try {
    const [categories, products] = await Promise.all([getCategories(), getProducts("?limit=100")]);
    return [
      ...statics,
      ...categories.map((c) => ({
        url: `${base}/shop?category=${c.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...products.items.map((p) => ({
        url: `${base}/product/${p.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return statics;
  }
}
