"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VariantSummary } from "@mb/contracts";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";

export function AddToCart({
  variants, currencySymbol,
}: {
  variants: VariantSummary[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const { add, loading, error, clearError } = useCart();
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!selected) return null;

  const min = selected.preOrder?.minOrderQty ?? 1;
  const max = selected.preOrder?.maxOrderQty ?? 99;

  const choose = (v: VariantSummary) => {
    setSelectedId(v.id);
    // Quantity limits differ per pack size, so clamp rather than silently fail.
    setQty((q) => Math.min(Math.max(q, v.preOrder?.minOrderQty ?? 1), v.preOrder?.maxOrderQty ?? 99));
    setAdded(false);
    clearError();
  };

  const submit = async () => {
    await add(selected.id, qty);
    setAdded(true);
  };

  return (
    <div className="stack">
      <div>
        <h2 className="sr-only">Choose a size</h2>
        <div className="variants">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              className="variant"
              aria-pressed={v.id === selected.id}
              onClick={() => choose(v)}
            >
              <span>
                <span className="variant-name">{v.name}</span>
                <br />
                <span className="variant-meta">
                  {v.preOrder
                    ? `Order by ${v.preOrder.cutoffTime} · ready in ${v.preOrder.leadTimeDays} day${v.preOrder.leadTimeDays === 1 ? "" : "s"}`
                    : "Ready to ship"}
                </span>
              </span>
              <span className="variant-price">{currencySymbol}{v.price}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <QuantityStepper value={qty} min={min} max={max} onChange={setQty} disabled={loading} />
        <span className="price" style={{ fontSize: "var(--step-2)" }}>
          {currencySymbol}{(Number(selected.price) * qty).toFixed(2)}
        </span>
      </div>

      {qty >= max && (
        <p className="subtle" style={{ margin: 0 }}>
          {max} is the most we can make of this per order.
        </p>
      )}

      {error && <div className="note note--error" role="alert">{error}</div>}

      {added ? (
        <div className="stack" style={{ gap: 8 }}>
          <div className="note note--fresh" role="status">Added to your basket.</div>
          <button type="button" className="btn btn--primary btn--block" onClick={() => router.push("/cart")}>
            Go to basket
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={submit} disabled={loading}>
          {loading ? "Adding…" : "Add to basket"}
        </button>
      )}
    </div>
  );
}
