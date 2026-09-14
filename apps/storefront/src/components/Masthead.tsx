import Link from "next/link";
import { IconPin } from "./Icons";

/**
 * The wordmark is set in type rather than served as a bitmap: it stays crisp
 * at every pixel density, costs a few hundred bytes instead of 40KB on every
 * page, and mirrors how the logo is actually built — serif wordmark, brass
 * rules, letterspaced terracotta BITES. The artwork itself appears at size in
 * the hero and the footer, where it has room to be read.
 */
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
    </header>
  );
}
