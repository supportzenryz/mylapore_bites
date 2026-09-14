import { z } from "zod";

export const marketViewSchema = z.object({
  code: z.string(),
  name: z.string(),
  currency: z.string().length(3),
  currencySymbol: z.string(),
  locale: z.string(),
  timezone: z.string(),
  phoneCountryCode: z.string(),
  orderHorizonDays: z.number().int(),
  pricesIncludeTax: z.boolean(),
});
export type MarketView = z.infer<typeof marketViewSchema>;
