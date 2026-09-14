import { DateTime } from "luxon";
import {
  addDays, cutoffInstant, friendlyDate, isCutoffPassed,
  isoWeekdayOf, productionDateFor,
} from "./business-date.js";

const IST = "Asia/Kolkata";
const KITCHEN = [1, 2, 3, 4, 5, 6]; // Mon–Sat

describe("isoWeekdayOf", () => {
  it("returns ISO weekdays (Mon=1, Sun=7)", () => {
    expect(isoWeekdayOf("2026-09-14", IST)).toBe(1); // Monday
    expect(isoWeekdayOf("2026-09-19", IST)).toBe(6); // Saturday
    expect(isoWeekdayOf("2026-09-20", IST)).toBe(7); // Sunday
  });
});

describe("productionDateFor", () => {
  it("walks back one working day for a 1-day lead time", () => {
    // Saturday delivery → Friday production
    expect(productionDateFor("2026-09-19", 1, KITCHEN, IST)).toBe("2026-09-18");
  });

  it("skips days the kitchen is closed", () => {
    // Monday delivery, 1 day lead, kitchen closed Sunday → Saturday production
    expect(productionDateFor("2026-09-21", 1, KITCHEN, IST)).toBe("2026-09-19");
  });

  it("counts working days, not calendar days, for longer leads", () => {
    // Monday delivery, 2 working days back, Sunday closed → Fri 18th
    expect(productionDateFor("2026-09-21", 2, KITCHEN, IST)).toBe("2026-09-18");
  });

  it("returns the delivery date itself for a zero lead time on a working day", () => {
    expect(productionDateFor("2026-09-18", 0, KITCHEN, IST)).toBe("2026-09-18");
  });

  it("returns null when a zero-lead item is requested on a closed day", () => {
    expect(productionDateFor("2026-09-20", 0, KITCHEN, IST)).toBeNull();
  });

  it("returns null rather than looping forever when no working day exists", () => {
    expect(productionDateFor("2026-09-21", 3, [], IST)).toBeNull();
  });
});

describe("cutoffInstant", () => {
  it("anchors the cut-off to the market timezone, not the server", () => {
    // 20:00 IST the day before Friday production = 2026-09-17T14:30Z
    const instant = cutoffInstant("2026-09-18", "20:00", 1, IST);
    expect(instant.toUTC().toISO()).toContain("2026-09-17T14:30");
  });
});

describe("isCutoffPassed", () => {
  const production = "2026-09-18"; // Friday
  const cutoff = "20:00";

  it("is open just before the cut-off", () => {
    const now = DateTime.fromISO("2026-09-17T19:59", { zone: IST });
    expect(isCutoffPassed(production, cutoff, 1, IST, now)).toBe(false);
  });

  it("is closed just after the cut-off", () => {
    const now = DateTime.fromISO("2026-09-17T20:01", { zone: IST });
    expect(isCutoffPassed(production, cutoff, 1, IST, now)).toBe(true);
  });

  it("is unaffected by the server's own timezone", () => {
    // Same instant expressed in UTC must give the same answer.
    const nowUtc = DateTime.fromISO("2026-09-17T14:31", { zone: "UTC" });
    expect(isCutoffPassed(production, cutoff, 1, IST, nowUtc)).toBe(true);
  });
});

describe("addDays / friendlyDate", () => {
  it("adds days within the market zone", () => {
    expect(addDays("2026-09-14", 5, IST)).toBe("2026-09-19");
  });

  it("formats a date the way customer copy needs it", () => {
    expect(friendlyDate("2026-09-19", IST)).toBe("Saturday, 19 September");
  });
});
