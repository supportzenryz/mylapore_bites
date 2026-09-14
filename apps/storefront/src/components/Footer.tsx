import Link from "next/link";

export function Footer({ marketName, currency }: { marketName: string; currency: string }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-cols">
          <div>
            {/* The real artwork, at a size where the temple and leaf read. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="foot-mark"
              src="/logo-lockup.png"
              alt="Mylapore Bites — Made fresh. From Mylapore. To your door."
              width={680}
              height={186}
            />
            <p style={{ margin: "0 0 8px", maxWidth: "34ch" }}>
              Traditional South Indian foods, prepared fresh in Mylapore and delivered
              to your door. We cook after you order, so nothing sits in a warehouse.
            </p>
            <p className="subtle" style={{ margin: 0 }}>
              Serving {marketName} · prices in {currency}
            </p>
          </div>
          <div>
            <h3>Shop</h3>
            <ul>
              <li><Link href="/shop">Everything</Link></li>
              <li><Link href="/shop?category=podis">Podis</Link></li>
              <li><Link href="/shop?category=pickles">Pickles</Link></li>
              <li><Link href="/shop?category=savouries">Savouries</Link></li>
              <li><Link href="/shop?category=sweets">Sweets</Link></li>
            </ul>
          </div>
          <div>
            <h3>Ordering</h3>
            <ul>
              <li><Link href="/how-it-works">How it works</Link></li>
              <li><Link href="/delivery">Delivery &amp; areas</Link></li>
              <li><Link href="/account">Your orders</Link></li>
            </ul>
          </div>
          <div>
            <h3>About</h3>
            <ul>
              <li><Link href="/our-story">Our story</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="foot-legal">
          © {new Date().getFullYear()} Mylapore Bites · Taste Tradition At Home · Made fresh in Mylapore, Chennai.
        </div>
      </div>
    </footer>
  );
}
