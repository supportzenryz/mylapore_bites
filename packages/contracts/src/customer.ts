import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().max(60).optional(),
  email: z.string().email().max(180).optional(),
  marketingOptInWhatsapp: z.boolean().optional(),
  marketingOptInEmail: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressInputSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  area: z.string().max(120).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  postcode: z.string().min(3).max(12),
  country: z.string().min(2).max(60).default("India"),
  landmark: z.string().max(200).optional(),
  deliveryInstructions: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export interface AddressView extends Omit<AddressInput, "phone" | "latitude" | "longitude"> {
  id: string;
  phoneE164: string;
  latitude: number | null;
  longitude: number | null;
  /** Resolved at read time so the UI can warn before checkout. */
  serviceable: boolean;
  zoneName: string | null;
}
