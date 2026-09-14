import { pointInPolygon, type LngLat } from "./geo.js";

// A rough box around Mylapore, Chennai.
const MYLAPORE: LngLat[] = [
  [80.255, 13.020], [80.285, 13.020], [80.285, 13.045], [80.255, 13.045], [80.255, 13.020],
];

describe("pointInPolygon", () => {
  it("places Kapaleeshwarar Temple inside the Mylapore zone", () => {
    expect(pointInPolygon([80.2697, 13.0336], MYLAPORE)).toBe(true);
  });

  it("places Adyar outside it", () => {
    expect(pointInPolygon([80.2574, 13.0067], MYLAPORE)).toBe(false);
  });

  it("handles a degenerate ring without throwing", () => {
    expect(pointInPolygon([80.27, 13.03], [])).toBe(false);
  });
});
