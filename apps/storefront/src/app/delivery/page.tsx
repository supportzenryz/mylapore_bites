import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "Delivery and areas" };

export default async function Page() {
  let market;
  try { market = await getMarket(); } catch (err) { return <ApiOffline error={err} />; }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 14px" }}>
            Delivery and areas
          </h1>
          <div className="panel prose">
            <p>
              We deliver across Chennai, starting from our kitchen in Mylapore. Delivery fees
              and minimum orders depend on your area and are always shown before you pay.
            </p>
            <h2>Choosing a date</h2>
            <p>
              Made-to-order items set your earliest delivery date. If your basket mixes a
              shelf-stable pickle with a fresh murukku, the murukku decides — and we will tell
              you which item is setting the date rather than just saying "unavailable".
            </p>
            <h2>Not in your area yet?</h2>
            <p>
              Enter your PIN code at checkout anyway. We record every postcode we cannot reach,
              and that list is how we decide which part of Chennai to open next.
            </p>
          </div>
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
