import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "Contact" };

export default async function Page() {
  let market;
  try { market = await getMarket(); } catch (err) { return <ApiOffline error={err} />; }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 14px" }}>
            Contact
          </h1>
          <div className="panel prose">
            <p>
              Something wrong with an order, or a question before you place one? The fastest
              way to reach us is WhatsApp — the same number we send order updates from.
            </p>
            <h2>Kitchen</h2>
            <p>Mylapore Production Centre, Mylapore, Chennai 600004.</p>
            <h2>Wholesale and gifting</h2>
            <p>
              For quantities beyond the per-order limits, or hampers for an event, get in
              touch and we will plan the production days with you.
            </p>
          </div>
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
