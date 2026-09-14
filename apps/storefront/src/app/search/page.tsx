import type { Metadata } from "next";
import Link from "next/link";
import { getMarket, searchProducts } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SearchField } from "@/components/SearchField";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "Search" };

const SUGGESTIONS = ["Idli podi", "Murukku", "Mango thokku", "Appalam", "Mysore pak"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let market, results;
  try {
    market = await getMarket();
    results = query ? await searchProducts(query) : null;
  } catch (err) {
    return <ApiOffline error={err} />;
  }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section section--tight">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 12px" }}>
            Search
          </h1>
          <SearchField initialQuery={query} />
        </section>

        {!query && (
          <section className="section section--tight">
            <p className="subtle" style={{ marginTop: 0 }}>Try one of these</p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="badge badge--stocked"
                  style={{ padding: "7px 13px", fontSize: 13 }}
                >
                  {s}
                </Link>
              ))}
            </div>
          </section>
        )}

        {results && (
          <section className="section section--tight">
            {results.items.length === 0 ? (
              <div className="empty">
                <h2>No matches for &ldquo;{query}&rdquo;</h2>
                <p>Try a shorter word, or browse the categories instead.</p>
                <Link href="/shop" className="btn btn--primary">Browse everything</Link>
              </div>
            ) : (
              <>
                <p className="subtle" style={{ marginTop: 0 }}>
                  {results.items.length} {results.items.length === 1 ? "result" : "results"} for
                  &ldquo;{query}&rdquo;
                </p>
                <div className="grid">
                  {results.items.map((p) => (
                    <ProductCard key={p.id} product={p} currencySymbol={market.currencySymbol} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
