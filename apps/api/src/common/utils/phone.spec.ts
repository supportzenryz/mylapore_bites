import { normalisePhone, maskPhone, PhoneNormalisationError } from "./phone.js";

describe("normalisePhone", () => {
  it("accepts the ways people actually type an Indian mobile", () => {
    // Every one of these is the same human. They must not become four customers.
    const variants = [
      "9876543210", "098765 43210", "+91 98765 43210",
      "0091-98765-43210", "919876543210", "+919876543210",
    ];
    for (const input of variants) {
      expect(normalisePhone(input, "+91")).toBe("+919876543210");
    }
  });

  it("respects an explicit country code over the market default", () => {
    expect(normalisePhone("07911 123456", "+44")).toBe("+447911123456");
  });

  it("keeps an already-international number in a different country", () => {
    expect(normalisePhone("+447911123456", "+91")).toBe("+447911123456");
  });

  it("rejects numbers of the wrong national length", () => {
    expect(() => normalisePhone("98765", "+91")).toThrow(PhoneNormalisationError);
    expect(() => normalisePhone("987654321012", "+91")).toThrow(PhoneNormalisationError);
  });

  it("rejects empty input", () => {
    expect(() => normalisePhone("", "+91")).toThrow(PhoneNormalisationError);
    expect(() => normalisePhone("   ", "+91")).toThrow(PhoneNormalisationError);
  });

  it("is idempotent", () => {
    const once = normalisePhone("9876543210", "+91");
    expect(normalisePhone(once, "+91")).toBe(once);
  });
});

describe("maskPhone", () => {
  it("hides the middle and keeps the tail for support screens", () => {
    const masked = maskPhone("+919876543210");
    expect(masked).toContain("10");
    expect(masked).not.toBe("+919876543210");
    expect(masked).toContain("*");
  });
});
