import type { ResolvedMarket } from "../market/market.service.js";
import type { CustomerPrincipal } from "../auth/customer-auth.guard.js";
import type { AdminPrincipal } from "../rbac/permissions.guard.js";

/**
 * Request augmentations in one place.
 *
 * Declared via `global.Express` rather than by augmenting
 * "express-serve-static-core" directly — under pnpm's strict node_modules that
 * transitive package is not resolvable from this app, so the augmentation
 * silently fails to apply and every `req.market` becomes an error.
 */
declare global {
  namespace Express {
    interface Request {
      /** Resolved from the Host header by MarketMiddleware. */
      market?: ResolvedMarket;
      /** Set by CustomerAuthGuard from a verified access token. */
      customer?: CustomerPrincipal;
      /** Set by the admin auth guard. */
      admin?: AdminPrincipal;
      /** Correlation id, echoed in responses and written to audit rows. */
      id?: string;
    }
  }
}

export {};
