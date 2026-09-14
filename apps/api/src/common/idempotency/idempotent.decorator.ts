import { SetMetadata } from "@nestjs/common";

export const IDEMPOTENT_KEY = "mb:idempotent";

/** Requires an Idempotency-Key header; replays return the original response. */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
