import type { Metadata } from "next";
import Link from "next/link";
import { getMarket } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ApiOffline } from "@/components/ApiOffline";
import { IconAccount } from "@/components/Icons";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
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
        <section className="section">
          <div className="empty">
            <IconAccount size={52} className="empty-glyph" />
            <h2>Sign in with WhatsApp</h2>
            <p>
              We send a code to your WhatsApp — no password to remember. The API for this
              is built and tested; the sign-in screen arrives with checkout in the next
              release.
            </p>
            <Link href="/shop" className="btn btn--primary">Keep shopping</Link>
          </div>
        </section>
      </main>
      <Footer marketName={market.name} currency={market.currency} />
    </>
  );
}
