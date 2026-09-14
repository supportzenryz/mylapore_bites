/** MB-IND-20260914-000123 */
export const MARKET_NUMBER_PREFIX: Record<string, string> = {
  IN: "IND",
  UK: "UK",
  US: "USA",
  AE: "UAE",
  AU: "AUS",
  CA: "CAN",
};

export function formatOrderNumber(marketCode: string, isoDate: string, seq: number): string {
  const prefix = MARKET_NUMBER_PREFIX[marketCode] ?? marketCode.toUpperCase();
  return `MB-${prefix}-${isoDate.replace(/-/g, "")}-${String(seq).padStart(6, "0")}`;
}

export const ORDER_NUMBER_PATTERN = /^MB-[A-Z]{2,3}-\d{8}-\d{6}$/;
