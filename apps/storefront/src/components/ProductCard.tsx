import Link from "next/link";
import type { ProductSummary } from "@mb/contracts";
import { StockBadge } from "./StockBadge";

/** Placeholder artwork until the photography arrives: the product's initials. */
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function ProductCard({
  product,
  currencySymbol,
}: {
  product: ProductSummary;
  currencySymbol: string;
}) {
  return (
    <Link href={`/product/${product.slug}`} className="pcard">
      <div className="pcard-media">
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="mono" aria-hidden="true">{initials(product.name)}</span>
        )}
        <span className="pcard-flag">
          <StockBadge stockMode={product.stockMode} isBestseller={product.isBestseller} />
        </span>
      </div>
      <div className="pcard-body">
        <span className="pcard-name">{product.name}</span>
        {product.shortDescription && <span className="pcard-note">{product.shortDescription}</span>}
        <div className="pcard-foot">
          <span className="price">
            {product.variantCount > 1 && <small>from </small>}
            {currencySymbol}{product.fromPrice}
          </span>
        </div>
      </div>
    </Link>
  );
}
