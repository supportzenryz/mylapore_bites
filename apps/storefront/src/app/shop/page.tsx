import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getMarket, getProducts } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { ApiOffline } from "@/components/ApiOffline";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  const title = category
    ? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Shop everything";
  return { title, description: `${title} — made fresh in Mylapore and delivered to your door.` };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; stockMode?: string }>;
}) {
  const { category, stockMode } = await searchParams;

  const qs = new URLSearchParams({ limit: "24" });
  if (category) qs.set("category", category);
  if (stockMode) qs.set("stockMode", stockMode);

  let market, products, categories;
  try {
    [market, products, categories] = await Promise.all([
      getMarket(),
      getProducts(`?${qs}`),
      getCategories(),
    ]);
  } catch (err) {
    return <ApiOffline error={err} />;
  }

  const current = categories.find((c) => c.slug === category);
  const heading = current?.name ?? (stockMode === "FRESH_PREORDER" ? "Made after you order" : "Everything we make");

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section section--tight">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 4px" }}>
            {heading}
          </h1>
          <p className="subtle" style={{ margin: 0 }}>
            {products.items.length} {products.items.length === 1 ? "product" : "products"}
            {current?.description ? ` · ${current.description}` : ""}
          </p>
        </section>

        {/* Category filter rail — horizontal on mobile, the way a phone wants it. */}
        <div className="rail" style={{ gridAutoColumns: "auto", marginBottom: 16 }}>
          <Link
            href="/shop"
            className={`badge ${category ? "badge--stocked" : "badge--new"}`}
            style={{ padding: "7px 13px", fontSize: 13 }}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className={`badge ${c.slug === category ? "badge--new" : "badge--stocked"}`}
              style={{ padding: "7px 13px", fontSize: 13 }}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <section className="section section--tight">
          {products.items.length === 0 ? (
            <div className="empty">
              <h2>Nothing here yet</h2>
              <p>We haven&rsquo;t added anything to this category. Try another one.</p>
              <Link href="/shop" className="btn btn--primary">See everything</Link>
            </div>
          ) : (
            <div className="grid">
              {products.items.map((p) => (
                <ProductCard key={p.id} product={p} currencySymbol={market.currencySymbol} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
