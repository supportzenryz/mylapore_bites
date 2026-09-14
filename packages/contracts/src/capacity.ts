import { z } from "zod";
import { isoDateSchema } from "./common.js";

export const capacityCheckSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1),
  deliveryDate: isoDateSchema,
});
export type CapacityCheckInput = z.infer<typeof capacityCheckSchema>;

export interface CapacityView {
  variantId: string;
  productionDate: string;
  capacityUnits: number;
  reservedUnits: number;
  remainingUnits: number;
  status: "OPEN" | "LOCKED" | "CLOSED";
}

/**
 * A refusal always carries the fix. `CAPACITY_EXHAUSTED` without
 * `nextAvailableDate` is a dead end for the customer.
 */
export interface ReservationOutcome {
  granted: boolean;
  reservationId: string | null;
  remainingUnits: number | null;
  reason: "OK" | "CAPACITY_EXHAUSTED" | "CAPACITY_LOCKED" | "NO_CAPACITY_ROW";
  nextAvailableDate: string | null;
}
