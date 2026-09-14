"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";
import { StockBadge } from "./StockBadge";
import { IconBasketEmpty } from "./Icons";

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function CartContents({ currencySymbol }: { currencySymbol: string }) {
  const { cart, loading, error, update, remove } = useCart();

  if (!cart) {
    return (
      <section className="section section--tight">
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Loading your basket…</p></div>
      </section>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="section">
        <div className="empty">
          <IconBasketEmpty className="empty-glyph" />
          <h2>Your basket is empty</h2>
          <p>Everything we make is cooked to order. Pick something and choose your day.</p>
          <Link href="/shop" className="btn btn--primary">Start shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {cart.freshnessSummary && (
        <div className="note note--fresh" style={{ marginBottom: 14 }}>
          {cart.freshnessSummary}
        </div>
      )}

      {error && <div className="note note--error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}

      <section className="panel" style={{ paddingBlock: 4 }}>
        {cart.lines.map((line) => (
          <div className="cline" key={line.id}>
            <div className="cline-media" aria-hidden="true">{initials(line.productName)}</div>
            <div className="cline-main">
              <div className="cline-top">
                <div style={{ minWidth: 0 }}>
                  <Link href={`/product/${line.productSlug}`} className="cline-name">
                    {line.productName}
                  </Link>
                  <div className="cline-sub">{line.variantName}</div>
                </div>
                <span className="price">{currencySymbol}{line.lineTotal}</span>
              </div>

              {line.preOrder && <StockBadge stockMode={line.stockMode} />}

              <div className="cline-foot">
                <QuantityStepper
                  value={line.qty}
                  min={0}
                  max={line.maxOrderQty}
                  disabled={loading}
                  onChange={(next) => (next === 0 ? remove(line.id) : update(line.id, next))}
                  label={`Quantity of ${line.productName}`}
                />
                <button
                  type="button"
                  onClick={() => remove(line.id)}
                  disabled={loading}
                  className="subtle"
                  style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="totals">
          <div className="totals-row">
            <span>Subtotal ({cart.totals.itemCount} {cart.totals.itemCount === 1 ? "item" : "items"})</span>
            <span>{currencySymbol}{cart.totals.subtotal}</span>
          </div>
          <div className="totals-row">
            <span>Tax</span>
            <span>{currencySymbol}{cart.totals.tax}</span>
          </div>
          <div className="totals-row">
            <span>Delivery</span>
            <span>{cart.totals.deliveryFee ?? "Calculated at checkout"}</span>
          </div>
          <div className="totals-row is-total">
            <span>Total</span>
            <span>{currencySymbol}{cart.totals.total}</span>
          </div>
        </div>

        {/*
          No checkout button yet. Checkout needs the availability engine and
          payments (Phases 3 and 4) — a button that went nowhere would be worse
          than an honest note.
        */}
        <div className="note note--info" style={{ marginTop: 14 }}>
          <b>Checkout opens in the next release.</b>
          <br />
          Choosing a delivery date, reserving kitchen capacity and paying arrive with
          Phases 3 and 4. Your basket is saved until then.
        </div>

        <Link href="/shop" className="btn btn--outline btn--block" style={{ marginTop: 12 }}>
          Keep shopping
        </Link>
      </section>
    </>
  );
}
