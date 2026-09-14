/**
 * The permission catalogue. Seeded into the database; the guard reads the
 * database, never this file at request time. Kept here so a new endpoint's
 * permission is code-reviewed alongside the endpoint.
 *
 * Shape: domain:resource:action
 */
export const PERMISSIONS = {
  catalog: [
    "catalog:product:read", "catalog:product:write", "catalog:product:delete",
    "catalog:category:read", "catalog:category:write",
    "catalog:price:write", "catalog:import:run",
  ],
  order: [
    "order:order:read", "order:order:write", "order:status:write",
    "order:refund:create", "order:note:write",
  ],
  production: [
    "production:plan:read", "production:plan:write",
    "production:batch:read", "production:batch:update",
    "production:capacity:read", "production:capacity:write",
    "production:sheet:print",
  ],
  inventory: [
    "inventory:item:read", "inventory:item:write",
    "inventory:movement:create", "inventory:ingredient:write",
  ],
  delivery: [
    "delivery:zone:read", "delivery:zone:write",
    "delivery:slot:write", "delivery:shipment:write",
  ],
  packing: ["packing:order:read", "packing:order:write"],
  customer: ["customer:customer:read", "customer:customer:write", "customer:segment:write"],
  discount: ["discount:coupon:read", "discount:coupon:write"],
  review: ["review:review:read", "review:review:moderate"],
  content: ["content:page:read", "content:page:write", "content:media:write"],
  report: ["report:sales:read", "report:production:read", "report:customer:read"],
  admin: [
    "admin:user:read", "admin:user:write",
    "admin:role:read", "admin:role:write",
    "admin:setting:write", "admin:audit:read",
  ],
} as const;

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flatMap((v) => [...v]);

/** Seeded role bundles. Editable in Admin afterwards — these are defaults. */
export const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  SUPER_ADMIN: "*",
  ADMIN: ALL_PERMISSIONS.filter((p) => !p.startsWith("admin:role:") && p !== "admin:user:write"),
  PRODUCT_MANAGER: [...PERMISSIONS.catalog, "report:sales:read", "inventory:item:read"],
  PRODUCTION_MANAGER: [
    ...PERMISSIONS.production, ...PERMISSIONS.inventory,
    "catalog:product:read", "order:order:read", "report:production:read",
  ],
  ORDER_MANAGER: [
    ...PERMISSIONS.order, ...PERMISSIONS.packing,
    "customer:customer:read", "catalog:product:read", "delivery:shipment:write",
    "report:sales:read",
  ],
  INVENTORY_MANAGER: [...PERMISSIONS.inventory, "catalog:product:read", "production:batch:read"],
  DELIVERY_MANAGER: [
    ...PERMISSIONS.delivery, "packing:order:read", "order:order:read", "order:status:write",
  ],
  CUSTOMER_SUPPORT: [
    "customer:customer:read", "customer:customer:write",
    "order:order:read", "order:note:write", "review:review:read",
    "catalog:product:read",
  ],
  CONTENT_MANAGER: [...PERMISSIONS.content, "catalog:category:read", "review:review:moderate"],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Full access including role management",
  ADMIN: "Day-to-day administration across all modules",
  PRODUCT_MANAGER: "Catalogue, pricing and product data",
  PRODUCTION_MANAGER: "Kitchen production plans, batches and ingredients",
  ORDER_MANAGER: "Orders, packing and customer fulfilment",
  INVENTORY_MANAGER: "Stock, ingredients and packaging",
  DELIVERY_MANAGER: "Zones, slots and dispatch",
  CUSTOMER_SUPPORT: "Read customers and orders, add notes",
  CONTENT_MANAGER: "Site content, media and review moderation",
};
