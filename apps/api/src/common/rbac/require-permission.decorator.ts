import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "mb:required-permissions";

/**
 * The ONLY way an admin endpoint declares its access requirement.
 * No service or controller contains a role comparison.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
