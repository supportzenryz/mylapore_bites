import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import {
  addCartItemSchema, updateCartItemSchema,
  type AddCartItemInput, type CartView, type UpdateCartItemInput,
} from "@mb/contracts";
import { zodPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Public } from "../../common/auth/public.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";
import { CartService } from "./cart.service.js";

const GUEST_COOKIE = "mb_cart";

/**
 * Public on purpose: browsing and building a basket must not require signing
 * in. A guest cart is keyed by an httpOnly cookie and adopted by the customer
 * when they log in.
 */
@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Public()
  @Get()
  async get(
    @CurrentMarket() market: ResolvedMarket,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CartView> {
    const { id } = await this.identify(market, req, res);
    return this.cart.view(id, market);
  }

  @Public()
  @Post("items")
  async addItem(
    @CurrentMarket() market: ResolvedMarket,
    @Body(zodPipe(addCartItemSchema)) body: AddCartItemInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CartView> {
    const { id } = await this.identify(market, req, res);
    return this.cart.addItem(id, market, body.variantId, body.qty);
  }

  @Public()
  @Patch("items/:itemId")
  async updateItem(
    @CurrentMarket() market: ResolvedMarket,
    @Param("itemId") itemId: string,
    @Body(zodPipe(updateCartItemSchema)) body: UpdateCartItemInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CartView> {
    const { id } = await this.identify(market, req, res);
    return this.cart.updateItem(id, market, itemId, body.qty);
  }

  @Public()
  @Delete("items/:itemId")
  async removeItem(
    @CurrentMarket() market: ResolvedMarket,
    @Param("itemId") itemId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CartView> {
    const { id } = await this.identify(market, req, res);
    return this.cart.removeItem(id, market, itemId);
  }

  @Public()
  @Delete()
  async clear(
    @CurrentMarket() market: ResolvedMarket,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CartView> {
    const { id } = await this.identify(market, req, res);
    return this.cart.clear(id, market);
  }

  private async identify(
    market: ResolvedMarket,
    req: Request,
    res: Response,
  ): Promise<{ id: string }> {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    const resolved = await this.cart.resolve(market, {
      customerId: req.customer?.id,
      guestToken: cookies?.[GUEST_COOKIE],
    });

    if (resolved.guestToken) {
      res.cookie(GUEST_COOKIE, resolved.guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86_400_000,
      });
    }
    return { id: resolved.id };
  }
}
