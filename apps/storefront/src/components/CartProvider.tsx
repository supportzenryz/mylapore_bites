"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { CartView } from "@mb/contracts";
import { ClientApiError, cartApi } from "@/lib/client-api";

interface CartContextValue {
  cart: CartView | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  add: (variantId: string, qty: number) => Promise<void>;
  update: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load once on mount. A failure here is not fatal — browsing still works.
  useEffect(() => {
    let cancelled = false;
    cartApi
      .get()
      .then((c) => { if (!cancelled) setCart(c); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const run = useCallback(async (fn: () => Promise<CartView>) => {
    setLoading(true);
    setError(null);
    try {
      setCart(await fn());
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? err.message
          : "We couldn't reach the kitchen just now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      error,
      itemCount: cart?.totals.itemCount ?? 0,
      add: (variantId, qty) => run(() => cartApi.add(variantId, qty)),
      update: (itemId, qty) => run(() => cartApi.update(itemId, qty)),
      remove: (itemId) => run(() => cartApi.remove(itemId)),
      clearError: () => setError(null),
    }),
    [cart, loading, error, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
