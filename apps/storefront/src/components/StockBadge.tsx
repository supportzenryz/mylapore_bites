import type { StockModeValue } from "@mb/contracts";

/**
 * The single place stock mode becomes customer-facing language.
 *
 * "Made to order" is the most important two words on the site — it sets the
 * expectation that the delivery date is chosen, not immediate.
 */
export function StockBadge({
  stockMode,
  isBestseller = false,
  size = "sm",
}: {
  stockMode: StockModeValue;
  isBestseller?: boolean;
  size?: "sm" | "md";
}) {
  const label = {
    FRESH_PREORDER: "Made to order",
    LIMITED_DAILY: "Limited daily",
    PREORDER_ONLY: "Pre-order",
    STOCKED: isBestseller ? "Bestseller" : "In stock",
  }[stockMode];

  const tone = {
    FRESH_PREORDER: "fresh",
    LIMITED_DAILY: "limited",
    PREORDER_ONLY: "new",
    STOCKED: isBestseller ? "limited" : "stocked",
  }[stockMode];

  return (
    <span className={`badge badge--${tone}`} style={size === "md" ? { fontSize: 12, padding: "4px 10px" } : undefined}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}
