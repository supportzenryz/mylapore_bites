"use client";

import type { CartView } from "@mb/contracts";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class ClientApiError extends Error {
  constructor(readonly code: string, message: string, readonly details?: Record<string, unknown>) {
    super(message);
  }
}

/**
 * Browser calls go straight to the public API with credentials, so the guest
 * cart cookie is set by the API on its own origin. `message` from the error
 * envelope is always safe to show — the API guarantees that.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string; message?: string; details?: Record<string, unknown>;
    };
    throw new ClientApiError(
      body.code ?? "INTERNAL",
      body.message ?? "Something went wrong. Please try again.",
      body.details,
    );
  }
  return (await res.json()) as T;
}

export const cartApi = {
  get: () => call<CartView>("/cart"),
  add: (variantId: string, qty: number) =>
    call<CartView>("/cart/items", { method: "POST", body: JSON.stringify({ variantId, qty }) }),
  update: (itemId: string, qty: number) =>
    call<CartView>(`/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ qty }) }),
  remove: (itemId: string) => call<CartView>(`/cart/items/${itemId}`, { method: "DELETE" }),
};
