import { formatMoney, fromMinorUnits, splitTax, toMinorUnits } from "./money.js";

describe("minor units", () => {
  it("round-trips without float drift", () => {
    for (const amount of ["0.01", "85.00", "195.00", "1150.00", "9999.99"]) {
      expect(fromMinorUnits(toMinorUnits(amount))).toBe(amount);
    }
  });

  it("handles the classic float trap", () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004; in minor units it is 30.
    expect(toMinorUnits(0.1) + toMinorUnits(0.2)).toBe(30);
  });
});

describe("splitTax", () => {
  it("extracts GST from an inclusive Indian price", () => {
    // ₹85.00 inclusive of 5% GST → net ₹80.95, tax ₹4.05
    const { netMinor, taxMinor, grossMinor } = splitTax(8500, 5, true);
    expect(grossMinor).toBe(8500);
    expect(netMinor + taxMinor).toBe(8500);
    expect(fromMinorUnits(taxMinor)).toBe("4.05");
  });

  it("adds VAT to an exclusive price", () => {
    const { netMinor, taxMinor, grossMinor } = splitTax(1000, 20, false);
    expect(netMinor).toBe(1000);
    expect(taxMinor).toBe(200);
    expect(grossMinor).toBe(1200);
  });

  it("is a no-op at zero rate, as UK food requires", () => {
    const result = splitTax(1095, 0, true);
    expect(result).toEqual({ netMinor: 1095, taxMinor: 0, grossMinor: 1095 });
  });

  it("never loses a paisa across a multi-quantity line", () => {
    const line = 8500 * 3;
    const { netMinor, taxMinor } = splitTax(line, 5, true);
    expect(netMinor + taxMinor).toBe(line);
  });
});

describe("formatMoney", () => {
  it("formats both market currencies", () => {
    expect(formatMoney("85.00", "INR", "en-IN")).toContain("85.00");
    expect(formatMoney("2.95", "GBP", "en-GB")).toContain("2.95");
  });
});
