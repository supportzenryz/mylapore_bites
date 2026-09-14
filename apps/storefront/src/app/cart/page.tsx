import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { CartContents } from "@/components/CartContents";
import { ApiOffline } from "@/components/ApiOffline";

export const metadata: Metadata = { title: "Your basket", robots: { index: false } };

export default async function CartPage() {
  let market;
  try {
    market = await getMarket();
  } catch (err) {
    return <ApiOffline error={err} />;
  }

  return (
    <>
      <Masthead locality="Mylapore, Chennai" />
      <main className="wrap">
        <section className="section section--tight">
          <h1 style={{ fontFamily: "var(--display)", fontSize: "var(--step-3)", margin: "0 0 4px" }}>
            Your basket
          </h1>
        </section>
        <CartContents currencySymbol={market.currencySymbol} />
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
