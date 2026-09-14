import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, getMarket, getProduct } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { StockBadge } from "@/components/StockBadge";
import { AddToCart } from "@/components/AddToCart";
import { ApiOffline } from "@/components/ApiOffline";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getProduct(slug);
    return {
      title: p.name,
      description: p.shortDescription ?? undefined,
      alternates: { canonical: `/product/${p.slug}` },
      openGraph: { title: p.name, description: p.shortDescription ?? undefined },
    };
  } catch {
    return { title: "Product" };
  }
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product, market;
  try {
    [product, market] = await Promise.all([getProduct(slug), getMarket()]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    return <ApiOffline error={err} />;
  }

  const preOrderVariant = product.variants.find((v) => v.preOrder);

  /* Product schema, so a search result shows the price and not just the name. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    brand: { "@type": "Brand", name: product.brand },
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.name,
      price: v.price,
      priceCurrency: v.currency,
      availability: "https://schema.org/PreOrder",
    })),
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.average,
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <nav aria-label="Breadcrumb" className="section section--tight" style={{ paddingBottom: 8 }}>
          <span className="subtle">
            <Link href="/shop">Shop</Link>
            {product.categories[0] && (
              <>
                {" / "}
                <Link href={`/shop?category=${product.categories[0].slug}`}>
                  {product.categories[0].name}
                </Link>
              </>
            )}
          </span>
        </nav>

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "1fr",
            alignItems: "start",
          }}
          className="pdp"
        >
          <div className="pcard-media" style={{ borderRadius: "var(--r-lg)", aspectRatio: "4 / 3" }}>
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].url} alt={product.images[0].altText ?? product.name} />
            ) : (
              <span className="mono" style={{ fontSize: "3.5rem" }} aria-hidden="true">
                {initials(product.name)}
              </span>
            )}
          </div>

          <div className="stack">
            <div>
              <StockBadge stockMode={product.stockMode} isBestseller={product.isBestseller} size="md" />
              <h1
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "var(--step-3)",
                  lineHeight: 1.12,
                  margin: "8px 0 6px",
                }}
              >
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="muted" style={{ margin: 0 }}>{product.shortDescription}</p>
              )}
            </div>

            {/* The pre-order promise, per product, computed from its own rule. */}
            {preOrderVariant?.preOrder && (
              <div className="note note--fresh">
                <b>{product.freshnessNote ?? "Made fresh after you order."}</b>
                <br />
                Order by {preOrderVariant.preOrder.cutoffTime}, and we cook it{" "}
                {preOrderVariant.preOrder.leadTimeDays === 1
                  ? "the day before delivery"
                  : `${preOrderVariant.preOrder.leadTimeDays} days before delivery`}
                . You&rsquo;ll pick your exact date at checkout.
              </div>
            )}

            <AddToCart variants={product.variants} currencySymbol={market.currencySymbol} />
          </div>
        </div>

        <section className="section">
          <div className="panel prose">
            {product.description && (
              <>
                <h2 style={{ marginTop: 0 }}>About this</h2>
                <p>{product.description}</p>
              </>
            )}
            {product.ingredients && (
              <>
                <h2>Ingredients</h2>
                <p>{product.ingredients}</p>
              </>
            )}
            {product.allergens.length > 0 && (
              <>
                <h2>Allergens</h2>
                <p>Contains {product.allergens.join(", ")}.</p>
              </>
            )}
            {product.storageInstructions && (
              <>
                <h2>Keeping it</h2>
                <p>{product.storageInstructions}</p>
              </>
            )}
            <p className="subtle">Country of origin: {product.countryOfOrigin}</p>
          </div>
        </section>
      </main>

      <Footer marketName={market.name} currency={market.currency} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
