import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  addressInputSchema, updateProfileSchema,
  type AddressInput, type AddressView, type UpdateProfileInput,
} from "@mb/contracts";
import { zodPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CurrentCustomer } from "../../common/auth/current-customer.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import type { CustomerPrincipal } from "../../common/auth/customer-auth.guard.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";
import { CustomerService } from "./customer.service.js";

@Controller("me")
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Get()
  async profile(@CurrentCustomer() me: CustomerPrincipal) {
    return this.customers.profile(me.id);
  }

  @Patch()
  async updateProfile(
    @CurrentCustomer() me: CustomerPrincipal,
    @Body(zodPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.customers.updateProfile(me.id, body);
  }

  @Get("addresses")
  async listAddresses(
    @CurrentCustomer() me: CustomerPrincipal,
    @CurrentMarket() market: ResolvedMarket,
  ): Promise<AddressView[]> {
    return this.customers.listAddresses(me.id, market);
  }

  @Post("addresses")
  async createAddress(
    @CurrentCustomer() me: CustomerPrincipal,
    @CurrentMarket() market: ResolvedMarket,
    @Body(zodPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.customers.createAddress(me.id, market, body);
  }

  @Patch("addresses/:id")
  async updateAddress(
    @CurrentCustomer() me: CustomerPrincipal,
    @CurrentMarket() market: ResolvedMarket,
    @Param("id") id: string,
    @Body(zodPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.customers.updateAddress(me.id, id, market, body);
  }

  @Delete("addresses/:id")
  @HttpCode(204)
  async deleteAddress(
    @CurrentCustomer() me: CustomerPrincipal,
    @Param("id") id: string,
  ): Promise<void> {
    return this.customers.deleteAddress(me.id, id);
  }
}
