import Link from "next/link";
import { IconPin } from "./Icons";

/**
 * The wordmark is set in type rather than served as a bitmap: it stays crisp
 * at every pixel density, costs a few hundred bytes instead of 40KB on every
 * page, and mirrors how the logo is actually built. Since the eatdesi.uk
 * retone, this typographic lockup renders in the new teal/navy/amber chrome
 * palette, while the real artwork (hero, footer) still shows its own
 * green/terracotta/brass — see the note at the top of globals.css.
 */
const TICKER_LINES = [
  "Made to order",
  "Rooted in Mylapore tradition",
  "Fresh from the kadai",
  "Delivered across Chennai & the UK",
];

function TickerSet() {
  return (
    <span className="marquee-set" aria-hidden="true">
      {TICKER_LINES.map((line) => (
        <span key={line} className="marquee-item">{line}</span>
      ))}
    </span>
  );
}

/**
 * Borrowed directly from eatdesi.uk's feel: a dark scrolling strip under the
 * nav, on every page. `aria-hidden` on both copies plus one screen-reader-only
 * static line keeps this decorative for assistive tech rather than read
 * twice on an endless loop.
 */
function MarqueeTicker() {
  return (
    <div className="marquee">
      <span className="sr-only">{TICKER_LINES.join(" — ")}</span>
      <div className="marquee-track">
        <TickerSet />
        <TickerSet />
      </div>
    </div>
  );
}

export function Masthead({ locality = "Mylapore" }: { locality?: string }) {
  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link href="/" className="brand" aria-label="Mylapore Bites — home">
          <span className="brand-word">Mylapore</span>
          <span className="brand-sub" aria-hidden="true">Bites</span>
        </Link>

        <nav className="desknav" aria-label="Primary">
          <Link href="/shop">Shop</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/search">Search</Link>
          <Link href="/cart">Basket</Link>
          <Link href="/account">Account</Link>
        </nav>

        <span className="locality" title={`Delivering to ${locality}`}>
          <IconPin />
          <span className="locality-long">Delivering to&nbsp;</span>
          {locality}
        </span>
      </div>
      <MarqueeTicker />
    </header>
  );
}
