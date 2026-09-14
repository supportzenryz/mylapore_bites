import { ORDER_NUMBER_PATTERN, formatOrderNumber } from "./order-number.js";

describe("formatOrderNumber", () => {
  it("matches the format agreed in the architecture", () => {
    expect(formatOrderNumber("IN", "2026-09-14", 123)).toBe("MB-IND-20260914-000123");
    expect(formatOrderNumber("UK", "2026-09-14", 124)).toBe("MB-UK-20260914-000124");
  });

  it("always satisfies the pattern, including at the boundaries", () => {
    for (const seq of [1, 999, 1000, 999999]) {
      expect(formatOrderNumber("IN", "2026-01-01", seq)).toMatch(ORDER_NUMBER_PATTERN);
    }
  });

  it("falls back to the market code for an unmapped market", () => {
    expect(formatOrderNumber("SG", "2026-09-14", 1)).toBe("MB-SG-20260914-000001");
  });
});
