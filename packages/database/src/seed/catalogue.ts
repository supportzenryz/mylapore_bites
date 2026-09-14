/**
 * Seed catalogue.
 *
 * Deliberately small and REAL rather than hundreds of placeholder rows: enough
 * products to exercise every stock mode, variant shape and price path, with
 * honest names, pack sizes and descriptions. The full ~440-SKU range comes in
 * through CSV import (Phase 8), not through this file.
 *
 * Every capacity and cut-off figure below is a PLACEHOLDER pending the real
 * kitchen numbers from the owner — see docs/open-questions.
 */

export interface SeedVariant {
  sku: string;
  name: string;
  packSize: number;
  unit: string;
  weightGrams?: number;
  shelfLifeDays?: number;
  priceInr: string;
  priceGbp?: string;
  /** Null for STOCKED items — nothing to produce, no capacity to reserve. */
  production?: {
    leadTimeDays: number;
    cutoffTime: string;
    cutoffOffsetDays: number;
    deliveryWeekdays: number[];
    productionWeekdays: number[];
    dailyCapacity: number;
    minOrderQty: number;
    maxOrderQty: number;
  };
}

export interface SeedProduct {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categorySlugs: string[];
  stockMode: "STOCKED" | "FRESH_PREORDER" | "LIMITED_DAILY" | "PREORDER_ONLY";
  freshnessNote?: string;
  taxClass: "FOOD_STANDARD" | "FOOD_SNACK";
  ingredients?: string;
  allergens?: string[];
  storageInstructions?: string;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  ukAvailable?: boolean;
  variants: SeedVariant[];
}

export const CATEGORIES: { slug: string; name: string; description: string; sortOrder: number }[] = [
  { slug: "podis", name: "Podis", description: "Traditional spice powders, ground fresh in small batches.", sortOrder: 1 },
  { slug: "pickles", name: "Pickles", description: "Slow-cured pickles made the way Mylapore kitchens always have.", sortOrder: 2 },
  { slug: "thokkus", name: "Thokkus", description: "Thick, slow-cooked relishes.", sortOrder: 3 },
  { slug: "savouries", name: "Savouries", description: "Murukku, mixture and everything fried to order.", sortOrder: 4 },
  { slug: "sweets", name: "Sweets", description: "Festival sweets and everyday treats.", sortOrder: 5 },
  { slug: "vadam", name: "Vadam", description: "Sun-dried fryums, ready for the kadai.", sortOrder: 6 },
  { slug: "vathal", name: "Vathal", description: "Sun-dried vegetables for frying and gravies.", sortOrder: 7 },
  { slug: "appalams", name: "Appalams", description: "Hand-rolled appalams in every size.", sortOrder: 8 },
  { slug: "instant-mixes", name: "Instant Mixes", description: "Batters and mixes for a quick tiffin.", sortOrder: 9 },
  { slug: "snacks", name: "Snacks", description: "Everyday snacking, tin-fresh.", sortOrder: 10 },
  { slug: "nuts-spices", name: "Nuts & Spices", description: "Whole spices and nuts, sourced and cleaned.", sortOrder: 11 },
  { slug: "bakery", name: "Bakery", description: "Biscuits and baked traditions.", sortOrder: 12 },
  { slug: "native-specials", name: "Native Specials", description: "Regional specialities you rarely find outside Tamil Nadu.", sortOrder: 13 },
  { slug: "ghee-oils", name: "Ghee & Oils", description: "Desi ghee, butter and cold-pressed chekku oils.", sortOrder: 14 },
  { slug: "gift-packs", name: "Gift Packs", description: "Curated hampers for festivals and family.", sortOrder: 15 },
];

const WEEKDAYS_ALL = [1, 2, 3, 4, 5, 6, 7];
const KITCHEN_DAYS = [1, 2, 3, 4, 5, 6];

export const PRODUCTS: SeedProduct[] = [
  {
    slug: "idli-podi",
    name: "Idli Podi",
    shortDescription: "The everyday gunpowder — roasted dals, red chilli and a little sesame.",
    description:
      "Our house idli podi, roasted in small batches and ground coarse so it still tastes of the dal. Mix it with a spoon of gingelly oil and it lifts a plain idli into breakfast worth waking up for.",
    categorySlugs: ["podis"],
    stockMode: "FRESH_PREORDER",
    freshnessNote: "Roasted and ground after you order.",
    taxClass: "FOOD_STANDARD",
    ingredients: "Urad dal, chana dal, red chilli, sesame seeds, asafoetida, salt, gingelly oil",
    allergens: ["sesame"],
    storageInstructions: "Keep in an airtight jar away from sunlight. Best within 90 days.",
    isBestseller: true,
    isFeatured: true,
    ukAvailable: true,
    variants: [
      { sku: "MB-PODI-IDLI-100", name: "100g", packSize: 100, unit: "g", weightGrams: 130, shelfLifeDays: 90, priceInr: "85.00", priceGbp: "2.95",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: WEEKDAYS_ALL, productionWeekdays: KITCHEN_DAYS, dailyCapacity: 200, minOrderQty: 1, maxOrderQty: 20 } },
      { sku: "MB-PODI-IDLI-250", name: "250g", packSize: 250, unit: "g", weightGrams: 300, shelfLifeDays: 90, priceInr: "195.00", priceGbp: "5.95",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: WEEKDAYS_ALL, productionWeekdays: KITCHEN_DAYS, dailyCapacity: 200, minOrderQty: 1, maxOrderQty: 15 } },
      { sku: "MB-PODI-IDLI-500", name: "500g", packSize: 500, unit: "g", weightGrams: 560, shelfLifeDays: 90, priceInr: "370.00", priceGbp: "10.95",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: WEEKDAYS_ALL, productionWeekdays: KITCHEN_DAYS, dailyCapacity: 120, minOrderQty: 1, maxOrderQty: 10 } },
    ],
  },
  {
    slug: "murukku",
    name: "Butter Murukku",
    shortDescription: "Fried to order, so it reaches you crisp rather than tired.",
    description:
      "Rice flour, roasted gram and a generous knob of butter, pressed by hand and fried the morning it goes out. This is the item our whole pre-order model exists for — murukku that has never sat in a warehouse.",
    categorySlugs: ["savouries"],
    stockMode: "LIMITED_DAILY",
    freshnessNote: "Fried the morning of dispatch. Limited quantity each day.",
    taxClass: "FOOD_SNACK",
    ingredients: "Rice flour, roasted gram flour, butter, cumin, sesame, asafoetida, salt, groundnut oil",
    allergens: ["milk", "sesame", "peanut"],
    storageInstructions: "Airtight tin. Best within 15 days.",
    isBestseller: true,
    isFeatured: true,
    ukAvailable: false,
    variants: [
      { sku: "MB-SAV-MURUKKU-250", name: "250g", packSize: 250, unit: "g", weightGrams: 290, shelfLifeDays: 15, priceInr: "160.00",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: [2, 3, 4, 5, 6, 7], productionWeekdays: KITCHEN_DAYS, dailyCapacity: 100, minOrderQty: 1, maxOrderQty: 8 } },
      { sku: "MB-SAV-MURUKKU-500", name: "500g", packSize: 500, unit: "g", weightGrams: 545, shelfLifeDays: 15, priceInr: "300.00",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: [2, 3, 4, 5, 6, 7], productionWeekdays: KITCHEN_DAYS, dailyCapacity: 100, minOrderQty: 1, maxOrderQty: 6 } },
    ],
  },
  {
    slug: "mango-thokku",
    name: "Mango Thokku",
    shortDescription: "Grated raw mango cooked down slowly with gingelly oil.",
    description:
      "Raw mango, grated and simmered with chilli, fenugreek and gingelly oil until it darkens and thickens. Made in small batches because it needs watching.",
    categorySlugs: ["thokkus", "pickles"],
    stockMode: "FRESH_PREORDER",
    freshnessNote: "Cooked in small batches after you order.",
    taxClass: "FOOD_STANDARD",
    ingredients: "Raw mango, gingelly oil, red chilli powder, fenugreek, mustard, asafoetida, salt",
    allergens: ["mustard"],
    storageInstructions: "Refrigerate after opening. Use a dry spoon.",
    isBestseller: true,
    ukAvailable: true,
    variants: [
      { sku: "MB-THOK-MANGO-300", name: "300g", packSize: 300, unit: "g", weightGrams: 420, shelfLifeDays: 180, priceInr: "180.00", priceGbp: "5.50",
        production: { leadTimeDays: 2, cutoffTime: "18:00", cutoffOffsetDays: 1, deliveryWeekdays: [3, 4, 5, 6, 7], productionWeekdays: [1, 2, 3, 4, 5], dailyCapacity: 50, minOrderQty: 1, maxOrderQty: 10 } },
      { sku: "MB-THOK-MANGO-500", name: "500g", packSize: 500, unit: "g", weightGrams: 650, shelfLifeDays: 180, priceInr: "285.00", priceGbp: "8.50",
        production: { leadTimeDays: 2, cutoffTime: "18:00", cutoffOffsetDays: 1, deliveryWeekdays: [3, 4, 5, 6, 7], productionWeekdays: [1, 2, 3, 4, 5], dailyCapacity: 50, minOrderQty: 1, maxOrderQty: 8 } },
    ],
  },
  {
    slug: "appalam-medium",
    name: "Appalam",
    shortDescription: "Hand-rolled, sun-dried, ready for the kadai.",
    description: "Classic urad appalam, rolled thin and dried in the Chennai sun. Fries up in seconds.",
    categorySlugs: ["appalams"],
    stockMode: "STOCKED",
    taxClass: "FOOD_STANDARD",
    ingredients: "Urad dal flour, salt, papad khar, groundnut oil",
    storageInstructions: "Keep dry. Best within 6 months.",
    ukAvailable: true,
    variants: [
      { sku: "MB-APP-STD-100", name: "100g", packSize: 100, unit: "g", weightGrams: 120, shelfLifeDays: 180, priceInr: "60.00", priceGbp: "2.25" },
      { sku: "MB-APP-STD-200", name: "200g", packSize: 200, unit: "g", weightGrams: 230, shelfLifeDays: 180, priceInr: "115.00", priceGbp: "3.95" },
    ],
  },
  {
    slug: "milagai-vathal",
    name: "Milagai Vathal",
    shortDescription: "Sun-dried curd chillies for tempering.",
    description: "Green chillies soaked in salted curd and dried in the sun over several days. A pinch in hot oil transforms a plain curd rice.",
    categorySlugs: ["vathal"],
    stockMode: "STOCKED",
    taxClass: "FOOD_STANDARD",
    ingredients: "Green chilli, curd, salt",
    allergens: ["milk"],
    storageInstructions: "Airtight, away from moisture.",
    ukAvailable: false,
    variants: [
      { sku: "MB-VTL-MILAGAI-100", name: "100g", packSize: 100, unit: "g", weightGrams: 115, shelfLifeDays: 365, priceInr: "95.00" },
    ],
  },
  {
    slug: "javvarisi-vadam",
    name: "Javvarisi Vadam",
    shortDescription: "Sago fryums, dried the traditional way.",
    description: "Sago and rice flour, spooned out and sun-dried on cotton sheets. They puff up beautifully.",
    categorySlugs: ["vadam"],
    stockMode: "STOCKED",
    taxClass: "FOOD_STANDARD",
    ingredients: "Sago, rice flour, salt, cumin",
    ukAvailable: true,
    variants: [
      { sku: "MB-VDM-JAV-200", name: "200g", packSize: 200, unit: "g", weightGrams: 220, shelfLifeDays: 365, priceInr: "110.00", priceGbp: "3.75" },
    ],
  },
  {
    slug: "adhirasam",
    name: "Adhirasam",
    shortDescription: "Made fresh for Deepavali. Pre-order only.",
    description:
      "Rice flour and jaggery, rested and fried in ghee. We make adhirasam to order for the festival season because it is at its best in the first few days.",
    categorySlugs: ["sweets", "native-specials"],
    stockMode: "PREORDER_ONLY",
    freshnessNote: "Festival pre-order. Made fresh in the Mylapore kitchen.",
    taxClass: "FOOD_SNACK",
    ingredients: "Raw rice, jaggery, ghee, cardamom, dry ginger",
    allergens: ["milk"],
    storageInstructions: "Best within 10 days.",
    isNew: true,
    ukAvailable: false,
    variants: [
      { sku: "MB-SWT-ADHI-6", name: "Box of 6", packSize: 6, unit: "piece", weightGrams: 400, shelfLifeDays: 10, priceInr: "270.00",
        production: { leadTimeDays: 2, cutoffTime: "17:00", cutoffOffsetDays: 2, deliveryWeekdays: [5, 6, 7], productionWeekdays: [3, 4, 5], dailyCapacity: 40, minOrderQty: 1, maxOrderQty: 5 } },
    ],
  },
  {
    slug: "chekku-gingelly-oil",
    name: "Chekku Gingelly Oil",
    shortDescription: "Cold-pressed in a wooden chekku.",
    description: "Sesame pressed slowly in a wooden ghani so it keeps its aroma. The oil our pickles are made with.",
    categorySlugs: ["ghee-oils"],
    stockMode: "STOCKED",
    taxClass: "FOOD_STANDARD",
    ingredients: "Sesame seeds",
    allergens: ["sesame"],
    ukAvailable: true,
    variants: [
      { sku: "MB-OIL-GIN-500", name: "500ml", packSize: 500, unit: "ml", weightGrams: 520, shelfLifeDays: 365, priceInr: "310.00", priceGbp: "9.50" },
      { sku: "MB-OIL-GIN-1000", name: "1 litre", packSize: 1000, unit: "ml", weightGrams: 1030, shelfLifeDays: 365, priceInr: "580.00", priceGbp: "16.95" },
    ],
  },
  {
    slug: "rava-dosa-mix",
    name: "Rava Dosa Mix",
    shortDescription: "Just add water, curd and an onion.",
    description: "Semolina, rice flour and seasoning in the right ratio for a lacy rava dosa without the guesswork.",
    categorySlugs: ["instant-mixes"],
    stockMode: "STOCKED",
    taxClass: "FOOD_STANDARD",
    ingredients: "Semolina, rice flour, maida, cumin, pepper, curry leaf, salt",
    allergens: ["gluten"],
    isNew: true,
    ukAvailable: true,
    variants: [
      { sku: "MB-MIX-RAVA-200", name: "200g", packSize: 200, unit: "g", weightGrams: 220, shelfLifeDays: 180, priceInr: "90.00", priceGbp: "3.25" },
    ],
  },
  {
    slug: "mysore-pak",
    name: "Ghee Mysore Pak",
    shortDescription: "Poured fresh. Soft, porous, unapologetically ghee.",
    description: "Gram flour, sugar and a great deal of ghee, cooked to the soft-set stage and poured while hot. Cut to order.",
    categorySlugs: ["sweets"],
    stockMode: "FRESH_PREORDER",
    freshnessNote: "Poured and cut after you order.",
    taxClass: "FOOD_SNACK",
    ingredients: "Gram flour, sugar, ghee, cardamom",
    allergens: ["milk"],
    storageInstructions: "Best within 7 days.",
    isFeatured: true,
    ukAvailable: false,
    variants: [
      { sku: "MB-SWT-MYSORE-250", name: "250g", packSize: 250, unit: "g", weightGrams: 290, shelfLifeDays: 7, priceInr: "210.00",
        production: { leadTimeDays: 1, cutoffTime: "19:00", cutoffOffsetDays: 1, deliveryWeekdays: [2, 3, 4, 5, 6, 7], productionWeekdays: KITCHEN_DAYS, dailyCapacity: 60, minOrderQty: 1, maxOrderQty: 6 } },
      { sku: "MB-SWT-MYSORE-500", name: "500g", packSize: 500, unit: "g", weightGrams: 545, shelfLifeDays: 7, priceInr: "400.00",
        production: { leadTimeDays: 1, cutoffTime: "19:00", cutoffOffsetDays: 1, deliveryWeekdays: [2, 3, 4, 5, 6, 7], productionWeekdays: KITCHEN_DAYS, dailyCapacity: 60, minOrderQty: 1, maxOrderQty: 4 } },
    ],
  },
  {
    slug: "kara-boondi",
    name: "Kara Boondi",
    shortDescription: "Crisp, peppery, and gone by evening.",
    description: "Gram flour boondi tossed with curry leaf, peanuts and pepper while still warm.",
    categorySlugs: ["savouries", "snacks"],
    stockMode: "LIMITED_DAILY",
    freshnessNote: "Made daily in limited quantity.",
    taxClass: "FOOD_SNACK",
    ingredients: "Gram flour, groundnut oil, peanuts, curry leaf, pepper, salt",
    allergens: ["peanut"],
    ukAvailable: false,
    variants: [
      { sku: "MB-SAV-BOONDI-200", name: "200g", packSize: 200, unit: "g", weightGrams: 230, shelfLifeDays: 20, priceInr: "120.00",
        production: { leadTimeDays: 1, cutoffTime: "20:00", cutoffOffsetDays: 1, deliveryWeekdays: [2, 3, 4, 5, 6, 7], productionWeekdays: KITCHEN_DAYS, dailyCapacity: 80, minOrderQty: 1, maxOrderQty: 10 } },
    ],
  },
  {
    slug: "festival-hamper",
    name: "Mylapore Festival Hamper",
    shortDescription: "Podi, pickle, murukku and sweets in one box.",
    description:
      "A hamper put together the way a Mylapore household would send one: idli podi, mango thokku, butter murukku and mysore pak, boxed and tied.",
    categorySlugs: ["gift-packs"],
    stockMode: "PREORDER_ONLY",
    freshnessNote: "Assembled fresh. Everything inside is made to order.",
    taxClass: "FOOD_SNACK",
    storageInstructions: "Follow the instructions on each item.",
    isFeatured: true,
    ukAvailable: false,
    variants: [
      { sku: "MB-GIFT-FEST-1", name: "Standard hamper", packSize: 1, unit: "piece", weightGrams: 1400, shelfLifeDays: 7, priceInr: "1150.00",
        production: { leadTimeDays: 2, cutoffTime: "17:00", cutoffOffsetDays: 2, deliveryWeekdays: [5, 6, 7], productionWeekdays: [3, 4, 5], dailyCapacity: 25, minOrderQty: 1, maxOrderQty: 4 } },
    ],
  },
];
