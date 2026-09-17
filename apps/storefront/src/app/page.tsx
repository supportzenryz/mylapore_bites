import Link from "next/link";
import { getCategories, getHomeContent, getMarket, getProducts } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SectionHead } from "@/components/SectionHead";
import { StockBadge } from "@/components/StockBadge";
import { IconKadai, IconOrder, IconParcel, IconScooter } from "@/components/Icons";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { ApiOffline } from "@/components/ApiOffline";

export const revalidate = 60;

const HOW_IT_WORKS = [
  { n: "01", Icon: IconOrder, title: "You order", body: "Choose what you want and the day you want it. Nothing is made yet." },
  { n: "02", Icon: IconKadai, title: "We prepare", body: "Your order is cooked fresh in our Mylapore kitchen on its production day." },
  { n: "03", Icon: IconParcel, title: "We pack", body: "Everything is quality checked, weighed and sealed the same day." },
  { n: "04", Icon: IconScooter, title: "We deliver", body: "It reaches your door in the slot you picked — often still warm." },
] as const;

export default async function HomePage() {
  let market, content, categories, featured, bestsellers, fresh;

  try {
    [market, content, categories, featured, bestsellers, fresh] = await Promise.all([
      getMarket(),
      getHomeContent(),
      getCategories(),
      getProducts("?featured=true&limit=8"),
      getProducts("?bestseller=true&limit=8"),
      getProducts("?stockMode=FRESH_PREORDER&limit=8"),
    ]);
  } catch (err) {
    return <ApiOffline error={err} />;
  }

  const symbol = market.currencySymbol;

  /**
   * Each homepage section shows products the sections above it didn't.
   *
   * Without this, a product that is fresh AND a bestseller AND featured appears
   * three times on one page, which makes the catalogue look thinner than it is.
   */
  const shown = new Set<string>();
  const take = (items: typeof featured.items, n: number) => {
    const picked = items.filter((p) => !shown.has(p.id)).slice(0, n);
    picked.forEach((p) => shown.add(p.id));
    return picked;
  };

  const freshPicks = take(fresh.items, 8);
  const bestsellerPicks = take(bestsellers.items, 8);
  const featuredPicks = take(featured.items, 8);

  /**
   * A rail holding one product reads as a mistake, not a recommendation.
   * With the full catalogue these are always well populated; with a small one
   * it is better to drop the section than to show a lonely card.
   */
  const MIN_RAIL = 2;

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />

      <main>
        {/* 1 — Categories open the page. With no hero above them, the drawings
            carry the first screen: what we make, said in pictures. */}
        <section className="catlead">
          <div className="wrap">
            <div className="catlead-head">
              <span className="hero-eyebrow">Taste Tradition At Home</span>
              <h1>{content.hero.headline}</h1>
              <p>{content.hero.subhead}</p>
            </div>
            <div className="catgrid">
              {categories.map((c) => (
                <Link key={c.id} href={`/shop?category=${c.slug}`} className="ctile">
                  <span className="ctile-glyph"><CategoryGlyph slug={c.slug} /></span>
                  <span className="ctile-name">{c.name}</span>
                  <span className="ctile-count">
                    {c.productCount} {c.productCount === 1 ? "item" : "items"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap">
          {/* 2 — The promise, stated as a timeline. This IS the business model. */}
          <section className="section">
            <div className="pledge">
              <h2>We don&rsquo;t keep this on a shelf</h2>
              <p>
                Almost everything here is made after you order it. That means choosing a
                delivery date — and it means what arrives was cooked days, not months, before
                you eat it.
              </p>
              <div className="timeline">
                <div className="tl-step">
                  <div className="tl-k">You order by</div>
                  <div className="tl-v">Thursday 8pm</div>
                </div>
                <div className="tl-step is-now">
                  <div className="tl-k">We cook</div>
                  <div className="tl-v">Friday morning</div>
                </div>
                <div className="tl-step">
                  <div className="tl-k">You eat</div>
                  <div className="tl-v">Saturday</div>
                </div>
              </div>
              <p className="subtle" style={{ margin: "10px 0 0", color: "rgba(242,245,241,.52)" }}>
                Example timings. Each item shows its own cut-off and delivery days.
              </p>
            </div>
          </section>

          {/* 4 — Made to order. The freshness proposition, shown as product. */}
          {freshPicks.length >= MIN_RAIL && (
            <section className="section">
              <SectionHead
                eyebrow="Made after you order"
                title="Fresh from the kadai"
                href="/shop?stockMode=FRESH_PREORDER"
              />
              <div className="rail">
                {freshPicks.map((p) => (
                  <ProductCard key={p.id} product={p} currencySymbol={symbol} />
                ))}
              </div>
            </section>
          )}

          {/* 5 — How it works */}
          <section className="section">
            <SectionHead eyebrow="Four steps" title="How it works" />
            <div className="steps">
              {HOW_IT_WORKS.map(({ n, Icon, title, body }) => (
                <div key={n} className="step">
                  <span className="step-n">{n}</span>
                  <span className="step-icon"><Icon /></span>
                  <b>{title}</b>
                  <span>{body}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6 — Bestsellers */}
          {bestsellerPicks.length >= MIN_RAIL && (
            <section className="section">
              <SectionHead eyebrow="Most ordered" title="Chennai favourites" href="/shop" />
              <div className="rail">
                {bestsellerPicks.map((p) => (
                  <ProductCard key={p.id} product={p} currencySymbol={symbol} />
                ))}
              </div>
            </section>
          )}

          {/* 7 — Featured */}
          {featuredPicks.length >= MIN_RAIL && (
            <section className="section">
              <SectionHead eyebrow="Picked by us" title="Worth trying" href="/shop" />
              <div className="grid">
                {featuredPicks.map((p) => (
                  <ProductCard key={p.id} product={p} currencySymbol={symbol} />
                ))}
              </div>
            </section>
          )}

          {/* 8 — Heritage */}
          <section className="section">
            <div className="panel">
              <SectionHead eyebrow="Our story" title="Cooked the Mylapore way" />
              <div className="prose">
                <p>
                  Mylapore has fed Chennai for a very long time. The podis, the pickles, the
                  murukku pressed by hand on a Sunday afternoon — these are household recipes
                  before they are products, and they taste best when they haven&rsquo;t travelled
                  far or waited long.
                </p>
                <p>
                  So we built the business around that rather than around a warehouse. You
                  tell us what you want and when. We cook it, check it, pack it, and send it.
                  Nothing is made to sit.
                </p>
              </div>
              <Link href="/our-story" className="btn btn--outline" style={{ marginTop: 6 }}>
                Read more
              </Link>
            </div>
          </section>

          {/* 9 — Delivery information */}
          <section className="section">
            <SectionHead eyebrow="Delivery" title={`Delivering across ${market.name}`} />
            <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="panel stack">
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  <StockBadge stockMode="FRESH_PREORDER" size="md" />
                  <StockBadge stockMode="LIMITED_DAILY" size="md" />
                  <StockBadge stockMode="STOCKED" size="md" />
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  Every product carries one of these. Made-to-order and limited items decide
                  your earliest delivery date; in-stock items ship with whatever else you order.
                </p>
                <p className="subtle" style={{ margin: 0 }}>
                  You can order up to {market.orderHorizonDays} days ahead. Prices in{" "}
                  {market.currency}
                  {market.pricesIncludeTax ? ", inclusive of tax" : ", excluding tax"}. Delivery
                  fees depend on your area and are shown before you pay.
                </p>
                <Link href="/delivery" className="btn btn--outline">Check your area</Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
