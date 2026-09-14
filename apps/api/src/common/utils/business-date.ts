import { DateTime } from "luxon";

/**
 * Every date rule in this platform is evaluated in the MARKET's timezone,
 * never the server's. A Chennai 8pm cut-off means 8pm in Chennai whether the
 * container runs in Mumbai, Frankfurt or a developer's laptop.
 */

export type IsoDate = string; // YYYY-MM-DD

export function todayInMarket(timezone: string): IsoDate {
  return DateTime.now().setZone(timezone).toISODate()!;
}

export function isoWeekdayOf(date: IsoDate, timezone: string): number {
  return DateTime.fromISO(date, { zone: timezone }).weekday; // 1=Mon..7=Sun
}

export function addDays(date: IsoDate, days: number, timezone: string): IsoDate {
  return DateTime.fromISO(date, { zone: timezone }).plus({ days }).toISODate()!;
}

export function dateRange(from: IsoDate, days: number, timezone: string): IsoDate[] {
  const start = DateTime.fromISO(from, { zone: timezone });
  return Array.from({ length: days }, (_, i) => start.plus({ days: i }).toISODate()!);
}

/**
 * Walks back from the delivery date by `leadTimeDays`, skipping days the
 * kitchen does not work. Returns null when no working day exists in range.
 */
export function productionDateFor(
  deliveryDate: IsoDate,
  leadTimeDays: number,
  productionWeekdays: number[],
  timezone: string,
  maxLookbackDays = 14,
): IsoDate | null {
  if (leadTimeDays <= 0) {
    return productionWeekdays.includes(isoWeekdayOf(deliveryDate, timezone)) ? deliveryDate : null;
  }
  let cursor = DateTime.fromISO(deliveryDate, { zone: timezone });
  let remaining = leadTimeDays;
  let guard = 0;

  while (remaining > 0 && guard < maxLookbackDays) {
    cursor = cursor.minus({ days: 1 });
    guard += 1;
    if (productionWeekdays.includes(cursor.weekday)) remaining -= 1;
  }
  return remaining === 0 ? cursor.toISODate()! : null;
}

/**
 * The moment ordering closes for a given production date, as an absolute
 * instant. `cutoffTime` is local wall-clock ("20:00") in the market zone.
 */
export function cutoffInstant(
  productionDate: IsoDate,
  cutoffTime: string,
  cutoffOffsetDays: number,
  timezone: string,
): DateTime {
  const [h, m] = cutoffTime.split(":").map((n) => Number(n));
  return DateTime.fromISO(productionDate, { zone: timezone })
    .minus({ days: cutoffOffsetDays })
    .set({ hour: h ?? 0, minute: m ?? 0, second: 0, millisecond: 0 });
}

export function isCutoffPassed(
  productionDate: IsoDate,
  cutoffTime: string,
  cutoffOffsetDays: number,
  timezone: string,
  now: DateTime = DateTime.now(),
): boolean {
  return now > cutoffInstant(productionDate, cutoffTime, cutoffOffsetDays, timezone);
}

/** Friendly label for customer-facing copy: "Saturday, 19 September". */
export function friendlyDate(date: IsoDate, timezone: string, locale = "en-GB"): string {
  return DateTime.fromISO(date, { zone: timezone })
    .setLocale(locale)
    .toFormat("cccc, d LLLL");
}
