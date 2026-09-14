import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "mb:is-public";

/**
 * Marks a route as readable without a session. Applied explicitly so that
 * forgetting it fails closed (401) rather than open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
