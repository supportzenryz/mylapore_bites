"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconAccount, IconCart, IconHome, IconSearch, IconShop } from "./Icons";
import { useCart } from "./CartProvider";

const TABS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/shop", label: "Shop", Icon: IconShop },
  { href: "/search", label: "Search", Icon: IconSearch },
  { href: "/cart", label: "Cart", Icon: IconCart },
  { href: "/account", label: "Account", Icon: IconAccount },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="tab" aria-current={active ? "page" : undefined}>
            <Icon size={21} />
            <span>{label}</span>
            {href === "/cart" && itemCount > 0 && (
              <span className="tab-count" aria-label={`${itemCount} items`}>{itemCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
