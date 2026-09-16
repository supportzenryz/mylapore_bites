import { Pool } from "pg";

/**
 * Bindings available to a Worker at runtime. `HYPERDRIVE` only exists once
 * `wrangler.toml` has a `[[hyperdrive]]` block (added once the Neon account
 * exists — see docs/architecture-cloudflare.html §09). Until then, local
 * dev and this sandbox both use `DATABASE_URL` directly, same connection
 * string the VPS-path API and the concurrency proofs already use.
 */
export interface Bindings {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
}

/**
 * One pool per Worker isolate. `pg` reaches Postgres over Hyperdrive's TCP
 * socket binding under the `nodejs_compat` compatibility flag (set in
 * wrangler.toml) — the same driver, same SQL, as the plain-VPS path.
 */
export function createPool(env: Bindings): Pool {
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No database connection configured (DATABASE_URL or HYPERDRIVE binding).");
  }
  return new Pool({ connectionString, max: 5 });
}
