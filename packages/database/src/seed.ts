import "dotenv/config";
import { hash as argonHash } from "@node-rs/argon2";
import { createPrismaClient } from "./client.js";
import { CATEGORIES, PRODUCTS } from "./seed/catalogue.js";

const prisma = createPrismaClient();

/** Placeholder permission catalogue — mirrors apps/api/src/common/rbac/permissions.ts */
const PERMISSIONS = [
  "catalog:product:read","catalog:product:write","catalog:product:delete","catalog:category:read",
  "catalog:category:write","catalog:price:write","catalog:import:run",
  "order:order:read","order:order:write","order:status:write","order:refund:create","order:note:write",
  "production:plan:read","production:plan:write","production:batch:read","production:batch:update",
  "production:capacity:read","production:capacity:write","production:sheet:print",
  "inventory:item:read","inventory:item:write","inventory:movement:create","inventory:ingredient:write",
  "delivery:zone:read","delivery:zone:write","delivery:slot:write","delivery:shipment:write",
  "packing:order:read","packing:order:write",
  "customer:customer:read","customer:customer:write","customer:segment:write",
  "discount:coupon:read","discount:coupon:write",
  "review:review:read","review:review:moderate",
  "content:page:read","content:page:write","content:media:write",
  "report:sales:read","report:production:read","report:customer:read",
  "admin:user:read","admin:user:write","admin:role:read","admin:role:write",
  "admin:setting:write","admin:audit:read",
];

const ROLES: Record<string, { name: string; description: string; permissions: string[] | "*" }> = {
  SUPER_ADMIN:        { name: "Super Admin", description: "Full access including role management", permissions: "*" },
  ADMIN:              { name: "Admin", description: "Day-to-day administration", permissions: PERMISSIONS.filter((p) => !p.startsWith("admin:role:") && p !== "admin:user:write") },
  PRODUCT_MANAGER:    { name: "Product Manager", description: "Catalogue, pricing and product data", permissions: PERMISSIONS.filter((p) => p.startsWith("catalog:") || p === "report:sales:read" || p === "inventory:item:read") },
  PRODUCTION_MANAGER: { name: "Production Manager", description: "Kitchen plans, batches and ingredients", permissions: PERMISSIONS.filter((p) => p.startsWith("production:") || p.startsWith("inventory:") || ["catalog:product:read","order:order:read","report:production:read"].includes(p)) },
  ORDER_MANAGER:      { name: "Order Manager", description: "Orders, packing and fulfilment", permissions: PERMISSIONS.filter((p) => p.startsWith("order:") || p.startsWith("packing:") || ["customer:customer:read","catalog:product:read","delivery:shipment:write","report:sales:read"].includes(p)) },
  INVENTORY_MANAGER:  { name: "Inventory Manager", description: "Stock, ingredients and packaging", permissions: PERMISSIONS.filter((p) => p.startsWith("inventory:") || ["catalog:product:read","production:batch:read"].includes(p)) },
  DELIVERY_MANAGER:   { name: "Delivery Manager", description: "Zones, slots and dispatch", permissions: PERMISSIONS.filter((p) => p.startsWith("delivery:") || ["packing:order:read","order:order:read","order:status:write"].includes(p)) },
  CUSTOMER_SUPPORT:   { name: "Customer Support", description: "Read customers and orders, add notes", permissions: ["customer:customer:read","customer:customer:write","order:order:read","order:note:write","review:review:read","catalog:product:read"] },
  CONTENT_MANAGER:    { name: "Content Manager", description: "Site content, media and reviews", permissions: PERMISSIONS.filter((p) => p.startsWith("content:") || ["catalog:category:read","review:review:moderate"].includes(p)) },
};

/**
 * Chennai launch zones. Real PIN codes around Mylapore; fees and minimums are
 * PLACEHOLDERS until the owner confirms them — nothing here is hard-coded in
 * application code, so changing them is an Admin edit, not a deploy.
 */
const CHENNAI_ZONES = [
  { code: "MYLAPORE",  name: "Mylapore & Around",  fee: "29.00", min: "299.00", free: "799.00",  mins: 60,  postcodes: ["600004", "600005", "600014", "600018"] },
  { code: "ADYAR",     name: "Adyar & Besant Nagar", fee: "39.00", min: "399.00", free: "999.00",  mins: 90,  postcodes: ["600020", "600090", "600041", "600028"] },
  { code: "TNAGAR",    name: "T. Nagar & Nungambakkam", fee: "39.00", min: "399.00", free: "999.00", mins: 90, postcodes: ["600017", "600034", "600035", "600086"] },
  { code: "CHENNAI_N", name: "North Chennai", fee: "59.00", min: "599.00", free: "1499.00", mins: 150, postcodes: ["600001", "600003", "600021", "600108"] },
];

const SLOTS = [
  { start: "10:00", end: "12:00", max: 25 },
  { start: "12:00", end: "14:00", max: 25 },
  { start: "14:00", end: "16:00", max: 25 },
  { start: "17:00", end: "19:00", max: 30 },
];

const NOTIFICATION_TEMPLATES = [
  { eventKey: "auth.otp",                channel: "WHATSAPP" as const, providerTemplate: "mb_login_code",        subject: null, body: "Your Mylapore Bites code is {{1}}. It expires in {{2}} minutes." },
  { eventKey: "auth.otp",                channel: "SMS" as const,      providerTemplate: null,                   subject: null, body: "Your Mylapore Bites code is {{1}}." },
  { eventKey: "order.confirmed",         channel: "WHATSAPP" as const, providerTemplate: "mb_order_confirmed",    subject: null, body: "Thanks {{1}}! Order {{2}} is confirmed for delivery on {{3}}." },
  { eventKey: "order.confirmed",         channel: "EMAIL" as const,    providerTemplate: null,                   subject: "Your Mylapore Bites order is confirmed", body: "We've got your order and we'll make it fresh." },
  { eventKey: "production.started",      channel: "WHATSAPP" as const, providerTemplate: "mb_production_started", subject: null, body: "Good news — order {{1}} is being prepared fresh in our Mylapore kitchen." },
  { eventKey: "order.packed",            channel: "WHATSAPP" as const, providerTemplate: "mb_order_packed",       subject: null, body: "Order {{1}} is quality checked and packed." },
  { eventKey: "order.out_for_delivery",  channel: "WHATSAPP" as const, providerTemplate: "mb_out_for_delivery",   subject: null, body: "Order {{1}} is on its way to you." },
  { eventKey: "order.delivered",         channel: "WHATSAPP" as const, providerTemplate: "mb_order_delivered",    subject: null, body: "Order {{1}} has been delivered. We hope you enjoy it." },
  { eventKey: "review.request",          channel: "WHATSAPP" as const, providerTemplate: "mb_review_request",     subject: null, body: "How was your Mylapore Bites order? Tap to rate it." },
];

const SEGMENTS = [
  { code: "NEW",       name: "New",       rules: { maxOrders: 1 },                 sortOrder: 1 },
  { code: "REPEAT",    name: "Repeat",    rules: { minOrders: 2, maxOrders: 5 },   sortOrder: 2 },
  { code: "LOYAL",     name: "Loyal",     rules: { minOrders: 6 },                 sortOrder: 3 },
  { code: "VIP",       name: "VIP",       rules: { minOrders: 12, minSpend: 15000 }, sortOrder: 4 },
  { code: "WHOLESALE", name: "Wholesale", rules: { manual: true },                 sortOrder: 5 },
];

async function main(): Promise<void> {
  console.log("Seeding Mylapore Bites…\n");

  // ---------------------------------------------------------------- warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "MYLAPORE" },
    update: {},
    create: {
      code: "MYLAPORE",
      name: process.env.SEED_DEFAULT_WAREHOUSE_NAME ?? "Mylapore Production Centre",
      isProductionCentre: true,
      city: "Chennai",
      state: "Tamil Nadu",
      postcode: "600004",
      country: "India",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`  warehouse       ${warehouse.name}`);

  // ------------------------------------------------------------- tax classes
  const taxStandard = await prisma.taxClass.upsert({
    where: { code: "FOOD_STANDARD" }, update: {},
    create: { code: "FOOD_STANDARD", name: "Food — standard rate", description: "Podis, pickles, oils" },
  });
  const taxSnack = await prisma.taxClass.upsert({
    where: { code: "FOOD_SNACK" }, update: {},
    create: { code: "FOOD_SNACK", name: "Food — snacks & sweets", description: "Namkeen, sweets, bakery" },
  });
  const taxClasses = { FOOD_STANDARD: taxStandard, FOOD_SNACK: taxSnack };

  // ----------------------------------------------------------------- markets
  const india = await prisma.market.upsert({
    where: { code: "IN" }, update: { defaultWarehouseId: warehouse.id },
    create: {
      code: "IN", name: "India", currency: "INR", currencySymbol: "₹", locale: "en-IN",
      timezone: "Asia/Kolkata", phoneCountryCode: "+91", paymentProvider: "RAZORPAY",
      orderHorizonDays: 21, pricesIncludeTax: true, defaultWarehouseId: warehouse.id,
    },
  });
  const uk = await prisma.market.upsert({
    where: { code: "UK" }, update: { defaultWarehouseId: warehouse.id },
    create: {
      code: "UK", name: "United Kingdom", currency: "GBP", currencySymbol: "£", locale: "en-GB",
      timezone: "Europe/London", phoneCountryCode: "+44", paymentProvider: "STRIPE",
      orderHorizonDays: 28, pricesIncludeTax: true, defaultWarehouseId: warehouse.id,
      isActive: false, // UK storefront exists structurally but is not open yet.
    },
  });
  console.log(`  markets         ${india.code} (active), ${uk.code} (inactive until UK launch)`);

  // ----------------------------------------------------------------- domains
  const domains: [string, string, boolean][] = [
    ["mylaporebites.com", india.id, true],
    ["www.mylaporebites.com", india.id, false],
    ["localhost", india.id, false],
    ["localhost:3000", india.id, false],
    ["storefront", india.id, false],
    ["mylaporebites.co.uk", uk.id, true],
    ["www.mylaporebites.co.uk", uk.id, false],
  ];
  for (const [hostname, marketId, isPrimary] of domains) {
    await prisma.marketDomain.upsert({
      where: { hostname }, update: { marketId, isPrimary }, create: { hostname, marketId, isPrimary },
    });
  }
  console.log(`  domains         ${domains.length}`);

  // --------------------------------------------------------------- tax rates
  const validFrom = new Date("2026-01-01");
  const rates: [string, string, string, string][] = [
    [india.id, taxStandard.id, "5.000", "GST 5%"],
    [india.id, taxSnack.id, "12.000", "GST 12%"],
    [uk.id, taxStandard.id, "0.000", "VAT 0% (zero-rated food)"],
    [uk.id, taxSnack.id, "20.000", "VAT 20% (standard-rated snacks)"],
  ];
  for (const [marketId, taxClassId, rate, label] of rates) {
    const existing = await prisma.taxRate.findFirst({ where: { marketId, taxClassId, validFrom } });
    if (!existing) await prisma.taxRate.create({ data: { marketId, taxClassId, rate, label, validFrom } });
  }
  console.log(`  tax rates       ${rates.length}`);

  // -------------------------------------------------------- RBAC & admin user
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code }, update: {},
      create: { code, domain: code.split(":")[0]!, description: code.replace(/:/g, " ") },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  for (const [code, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { code }, update: { name: def.name, description: def.description },
      create: { code, name: def.name, description: def.description, isSystem: true },
    });
    const codes = def.permissions === "*" ? PERMISSIONS : def.permissions;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: codes
        .map((c) => permissionByCode.get(c))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  console.log(`  rbac            ${PERMISSIONS.length} permissions, ${Object.keys(ROLES).length} roles`);

  const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const admin = await prisma.adminUser.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {},
      create: {
        email: adminEmail.toLowerCase(),
        passwordHash: await argonHash(adminPassword),
        firstName: "Super", lastName: "Admin",
      },
    });
    const superRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
    await prisma.adminUserRole.upsert({
      where: { adminUserId_roleId: { adminUserId: admin.id, roleId: superRole.id } },
      update: {}, create: { adminUserId: admin.id, roleId: superRole.id },
    });
    console.log(`  admin user      ${admin.email} (SUPER_ADMIN)`);
  } else {
    console.log("  admin user      skipped — set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD");
  }

  // -------------------------------------------------------------- segments
  for (const s of SEGMENTS) {
    await prisma.customerSegment.upsert({
      where: { code: s.code }, update: {},
      create: { code: s.code, name: s.name, rules: s.rules, sortOrder: s.sortOrder },
    });
  }

  // ------------------------------------------------------------- categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, sortOrder: c.sortOrder },
      create: { slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder,
                seoTitle: `${c.name} — Mylapore Bites`, seoDescription: c.description },
    });
  }
  console.log(`  categories      ${CATEGORIES.length}`);

  // --------------------------------------------------------------- products
  let variantCount = 0;
  let ruleCount = 0;

  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name, shortDescription: p.shortDescription, description: p.description,
        stockMode: p.stockMode, freshnessNote: p.freshnessNote ?? null,
        taxClassId: taxClasses[p.taxClass].id,
      },
      create: {
        slug: p.slug, name: p.name, shortDescription: p.shortDescription, description: p.description,
        stockMode: p.stockMode, freshnessNote: p.freshnessNote ?? null,
        taxClassId: taxClasses[p.taxClass].id,
        ingredients: p.ingredients ?? null,
        allergens: p.allergens ?? [],
        storageInstructions: p.storageInstructions ?? null,
        isFeatured: p.isFeatured ?? false,
        isBestseller: p.isBestseller ?? false,
        isNew: p.isNew ?? false,
        seoTitle: `${p.name} — Mylapore Bites`,
        seoDescription: p.shortDescription,
      },
    });

    for (const slug of p.categorySlugs) {
      const category = await prisma.category.findUnique({ where: { slug } });
      if (!category) continue;
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
        update: {}, create: { productId: product.id, categoryId: category.id, isPrimary: slug === p.categorySlugs[0] },
      });
    }

    // Placeholder imagery until the real photography arrives.
    const existingImage = await prisma.productImage.findFirst({ where: { productId: product.id } });
    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `/images/products/${p.slug}.jpg`,
          altText: `${p.name} from Mylapore Bites`,
          isThumbnail: true, sortOrder: 0,
        },
      });
    }

    const marketsForProduct = p.ukAvailable ? [india, uk] : [india];
    for (const market of marketsForProduct) {
      const mp = await prisma.marketProduct.upsert({
        where: { marketId_productId: { marketId: market.id, productId: product.id } },
        update: { isActive: true }, create: { marketId: market.id, productId: product.id, isActive: true },
      });

      for (const [index, v] of p.variants.entries()) {
        const price = market.code === "IN" ? v.priceInr : v.priceGbp;
        if (!price) continue;

        const variant = await prisma.productVariant.upsert({
          where: { sku: v.sku },
          update: { name: v.name, packSize: v.packSize, unit: v.unit, sortOrder: index },
          create: {
            productId: product.id, sku: v.sku, name: v.name,
            packSize: v.packSize, unit: v.unit,
            weightGrams: v.weightGrams ?? null,
            shelfLifeDays: v.shelfLifeDays ?? null,
            sortOrder: index,
          },
        });
        if (market.code === "IN") variantCount += 1;

        if (v.production && market.code === "IN") {
          await prisma.variantProductionRule.upsert({
            where: { variantId: variant.id },
            update: v.production,
            create: { variantId: variant.id, ...v.production },
          });
          ruleCount += 1;
        }

        await prisma.marketProductVariant.upsert({
          where: { marketProductId_variantId: { marketProductId: mp.id, variantId: variant.id } },
          update: { price }, create: { marketProductId: mp.id, variantId: variant.id, price },
        });
      }
    }
  }
  console.log(`  products        ${PRODUCTS.length} (${variantCount} variants, ${ruleCount} production rules)`);

  // ---------------------------------------------------------- delivery zones
  let slotCount = 0;
  for (const [index, z] of CHENNAI_ZONES.entries()) {
    const zone = await prisma.deliveryZone.upsert({
      where: { marketId_code: { marketId: india.id, code: z.code } },
      update: { name: z.name, deliveryFee: z.fee, minOrderValue: z.min, freeDeliveryThreshold: z.free },
      create: {
        marketId: india.id, code: z.code, name: z.name,
        deliveryFee: z.fee, minOrderValue: z.min, freeDeliveryThreshold: z.free,
        estimatedMinutes: z.mins, serviceWeekdays: [1, 2, 3, 4, 5, 6, 7], sortOrder: index,
      },
    });

    for (const postcode of z.postcodes) {
      await prisma.zonePostcode.upsert({
        where: { zoneId_postcode: { zoneId: zone.id, postcode } },
        update: {}, create: { zoneId: zone.id, postcode },
      });
    }

    for (let weekday = 1; weekday <= 7; weekday += 1) {
      for (const [i, s] of SLOTS.entries()) {
        await prisma.deliverySlot.upsert({
          where: { zoneId_weekday_startTime: { zoneId: zone.id, weekday, startTime: s.start } },
          update: { endTime: s.end, maxOrders: s.max },
          create: { zoneId: zone.id, weekday, startTime: s.start, endTime: s.end, maxOrders: s.max, sortOrder: i },
        });
        slotCount += 1;
      }
    }
  }
  console.log(`  delivery        ${CHENNAI_ZONES.length} Chennai zones, ${slotCount} slots`);

  // ------------------------------------------------------------- templates
  for (const t of NOTIFICATION_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { eventKey_channel_locale: { eventKey: t.eventKey, channel: t.channel, locale: "en" } },
      update: { providerTemplate: t.providerTemplate, subject: t.subject, body: t.body },
      create: {
        eventKey: t.eventKey, channel: t.channel, locale: "en",
        providerTemplate: t.providerTemplate, subject: t.subject, body: t.body,
      },
    });
  }
  console.log(`  templates       ${NOTIFICATION_TEMPLATES.length}`);

  // -------------------------------------------------------------- settings
  const settings: [string, unknown, boolean][] = [
    ["brand.tagline", "Made Fresh. From Mylapore. To Your Door.", true],
    ["brand.supportPhone", "+914400000000", true],
    ["checkout.capacityHoldMinutes", 15, false],
    ["checkout.unpaidOrderExpiryMinutes", 20, false],
    ["homepage.heroHeadline", "Made Fresh. From Mylapore. To Your Door.", true],
    ["homepage.heroSubhead", "Traditional South Indian foods prepared fresh in Mylapore and delivered to your home.", true],
  ];
  for (const [key, value, isPublic] of settings) {
    await prisma.setting.upsert({
      where: { marketId_key: { marketId: india.id, key } },
      update: { value: value as never, isPublic },
      create: { marketId: india.id, key, value: value as never, isPublic },
    });
  }
  console.log(`  settings        ${settings.length}`);

  console.log("\nSeed complete.\n");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
