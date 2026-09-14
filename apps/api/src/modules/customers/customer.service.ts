import { Injectable } from "@nestjs/common";
import {
  ErrorCode, type AddressInput, type AddressView, type UpdateProfileInput,
} from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { DomainError } from "../../common/errors/domain.error.js";
import { normalisePhone } from "../../common/utils/phone.js";
import { ZoneService } from "../delivery/zone.service.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zones: ZoneService,
  ) {}

  async profile(customerId: string) {
    const c = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { segment: { select: { code: true, name: true } } },
    });
    if (!c || c.deletedAt) throw new DomainError(ErrorCode.NOT_FOUND, "Account not found.");

    return {
      id: c.id,
      customerRef: c.customerRef,
      phoneE164: c.phoneE164,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      orderCount: c.orderCount,
      lastOrderAt: c.lastOrderAt,
      segment: c.segment,
      marketingOptInWhatsapp: c.marketingOptInWhatsapp,
      marketingOptInEmail: c.marketingOptInEmail,
    };
  }

  async updateProfile(customerId: string, input: UpdateProfileInput) {
    await this.prisma.customer.update({ where: { id: customerId }, data: input });
    return this.profile(customerId);
  }

  async listAddresses(customerId: string, market: ResolvedMarket): Promise<AddressView[]> {
    const rows = await this.prisma.address.findMany({
      where: { customerId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: { deliveryZone: true },
    });

    // Serviceability is re-resolved on read: zones change, saved addresses don't.
    return Promise.all(
      rows.map(async (a) => {
        const zone = await this.zones.resolve(
          market.id, a.postcode, a.latitude ? Number(a.latitude) : null,
          a.longitude ? Number(a.longitude) : null,
        );
        return toView(a, zone?.name ?? null, Boolean(zone));
      }),
    );
  }

  async createAddress(
    customerId: string,
    market: ResolvedMarket,
    input: AddressInput,
  ): Promise<AddressView> {
    const phoneE164 = normalisePhone(input.phone, market.phoneCountryCode);
    const zone = await this.zones.resolve(market.id, input.postcode, input.latitude, input.longitude);

    if (!zone) await this.zones.recordUnserviceable(market.id, input.postcode);

    const created = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } });
      }
      const count = await tx.address.count({ where: { customerId, deletedAt: null } });

      return tx.address.create({
        data: {
          customerId,
          label: input.label,
          fullName: input.fullName,
          phoneE164,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          area: input.area ?? null,
          city: input.city,
          state: input.state ?? null,
          postcode: input.postcode.replace(/\s+/g, "").toUpperCase(),
          country: input.country,
          landmark: input.landmark ?? null,
          deliveryInstructions: input.deliveryInstructions ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          deliveryZoneId: zone?.id ?? null,
          isDefault: input.isDefault || count === 0,
        },
      });
    });

    return toView(created, zone?.name ?? null, Boolean(zone));
  }

  async updateAddress(
    customerId: string, addressId: string, market: ResolvedMarket, input: AddressInput,
  ): Promise<AddressView> {
    await this.assertOwned(customerId, addressId);
    const phoneE164 = normalisePhone(input.phone, market.phoneCountryCode);
    const zone = await this.zones.resolve(market.id, input.postcode, input.latitude, input.longitude);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          label: input.label,
          fullName: input.fullName,
          phoneE164,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          area: input.area ?? null,
          city: input.city,
          state: input.state ?? null,
          postcode: input.postcode.replace(/\s+/g, "").toUpperCase(),
          country: input.country,
          landmark: input.landmark ?? null,
          deliveryInstructions: input.deliveryInstructions ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          deliveryZoneId: zone?.id ?? null,
          isDefault: input.isDefault,
        },
      });
    });

    return toView(updated, zone?.name ?? null, Boolean(zone));
  }

  /**
   * Soft delete. Orders snapshot the address, so removing it never rewrites
   * delivery history.
   */
  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    await this.assertOwned(customerId, addressId);
    await this.prisma.address.update({
      where: { id: addressId },
      data: { deletedAt: new Date(), isDefault: false },
    });
  }

  private async assertOwned(customerId: string, addressId: string): Promise<void> {
    const row = await this.prisma.address.findFirst({
      where: { id: addressId, customerId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new DomainError(ErrorCode.NOT_FOUND, "We couldn't find that address.");
  }
}

function toView(
  a: {
    id: string; label: string; fullName: string; phoneE164: string;
    addressLine1: string; addressLine2: string | null; area: string | null;
    city: string; state: string | null; postcode: string; country: string;
    landmark: string | null; deliveryInstructions: string | null;
    latitude: unknown; longitude: unknown; isDefault: boolean;
  },
  zoneName: string | null,
  serviceable: boolean,
): AddressView {
  return {
    id: a.id,
    label: a.label as AddressView["label"],
    fullName: a.fullName,
    phoneE164: a.phoneE164,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? undefined,
    area: a.area ?? undefined,
    city: a.city,
    state: a.state ?? undefined,
    postcode: a.postcode,
    country: a.country,
    landmark: a.landmark ?? undefined,
    deliveryInstructions: a.deliveryInstructions ?? undefined,
    latitude: a.latitude == null ? null : Number(a.latitude),
    longitude: a.longitude == null ? null : Number(a.longitude),
    isDefault: a.isDefault,
    serviceable,
    zoneName,
  };
}
