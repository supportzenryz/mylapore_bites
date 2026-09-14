/**
 * Money is handled as minor units (paise/pence) internally so no float
 * rounding can creep into a total. Decimal strings cross the API boundary.
 */

export function toMinorUnits(amount: string | number): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid money amount: ${amount}`);
  return Math.round(n * 100);
}

export function fromMinorUnits(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Tax on a tax-inclusive price (India GST) is extracted, not added.
 * On an exclusive price (UK trade) it is added on top.
 */
export function splitTax(
  grossOrNetMinor: number,
  ratePercent: number,
  inclusive: boolean,
): { netMinor: number; taxMinor: number; grossMinor: number } {
  if (ratePercent === 0) {
    return { netMinor: grossOrNetMinor, taxMinor: 0, grossMinor: grossOrNetMinor };
  }
  if (inclusive) {
    const net = Math.round(grossOrNetMinor / (1 + ratePercent / 100));
    return { netMinor: net, taxMinor: grossOrNetMinor - net, grossMinor: grossOrNetMinor };
  }
  const tax = Math.round(grossOrNetMinor * (ratePercent / 100));
  return { netMinor: grossOrNetMinor, taxMinor: tax, grossMinor: grossOrNetMinor + tax };
}

export function formatMoney(amount: string | number, currency: string, locale = "en-IN"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
