import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "How it works" };

export default async function Page() {
  let market;
  try { market = await getMarket(); } catch (err) { return <ApiOffline error={err} />; }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 14px" }}>
            How it works
          </h1>
          <div className="panel prose">
            <p>
              Almost nothing on this site exists when you order it. That is deliberate.
            </p>
            <h2>1. You order</h2>
            <p>
              Pick what you want. Each product shows its own cut-off time and the days we
              can deliver it, because a murukku and a bottle of gingelly oil do not work
              the same way.
            </p>
            <h2>2. We reserve the kitchen</h2>
            <p>
              When you choose a delivery date, we hold capacity in the Mylapore kitchen for
              that day. That is why a date sometimes stops being available — we would rather
              tell you that than take an order we cannot cook well.
            </p>
            <h2>3. We cook, check and pack</h2>
            <p>
              On the production day your items are made, weighed, checked and sealed. You get
              a WhatsApp message when they go into production and again when they are packed.
            </p>
            <h2>4. We deliver</h2>
            <p>
              Within the slot you chose. If anything goes wrong, you hear it from us first.
            </p>
          </div>
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
