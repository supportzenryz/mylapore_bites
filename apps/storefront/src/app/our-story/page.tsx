import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "Our story" };

export default async function Page() {
  let market;
  try { market = await getMarket(); } catch (err) { return <ApiOffline error={err} />; }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 14px" }}>
            Our story
          </h1>
          <div className="panel prose">
            <p>
              Mylapore has fed Chennai for a very long time. The podis, the pickles, the
              murukku pressed by hand on a Sunday afternoon — these are household recipes
              before they are products.
            </p>
            <p>
              Food like this is at its best soon after it is made. A podi ground this week
              smells different to one ground last quarter. So we did not build a warehouse
              and fill it. We built a kitchen and a calendar.
            </p>
            <h2>What that means for you</h2>
            <p>
              You choose a day. We cook for that day. Nothing sits waiting to be sold, and
              nothing reaches you having spent months in a box.
            </p>
          </div>
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
