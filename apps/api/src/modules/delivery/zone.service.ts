import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { pointInPolygon } from "../../common/utils/geo.js";

export interface ZoneMatch {
  id: string;
  code: string;
  name: string;
  deliveryFee: string;
  minOrderValue: string;
  freeDeliveryThreshold: string | null;
  serviceWeekdays: number[];
}

/**
 * Zone resolution, in order:
 *   1. Postcode match — fast, exact, sufficient for a Chennai launch.
 *   2. Polygon containment — for a PIN that straddles two zones.
 *   3. No match — recorded, because that list decides which suburb opens next.
 */
@Injectable()
export class ZoneService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    marketId: string,
    postcode: string,
    lat?: number | null,
    lng?: number | null,
  ): Promise<ZoneMatch | null> {
    const normalised = postcode.replace(/\s+/g, "").toUpperCase();

    const byPostcode = await this.prisma.zonePostcode.findFirst({
      where: { postcode: normalised, zone: { marketId, isActive: true } },
      include: { zone: true },
    });
    if (byPostcode) return toMatch(byPostcode.zone);

    if (lat != null && lng != null) {
      const zones = await this.prisma.deliveryZone.findMany({
        where: { marketId, isActive: true, polygon: { not: null } },
      });
      for (const zone of zones) {
        const ring = extractRing(zone.polygon);
        if (ring && pointInPolygon([lng, lat], ring)) return toMatch(zone);
      }
    }

    return null;
  }

  async recordUnserviceable(marketId: string, postcode: string): Promise<void> {
    // Demand signal for expansion planning. Best-effort: never block a request.
    await this.prisma.setting
      .upsert({
        where: { marketId_key: { marketId, key: `demand:postcode:${postcode}` } },
        create: { marketId, key: `demand:postcode:${postcode}`, value: { count: 1 }, isPublic: false },
        update: {},
      })
      .catch(() => undefined);
  }
}

function toMatch(z: {
  id: string; code: string; name: string;
  deliveryFee: { toString(): string }; minOrderValue: { toString(): string };
  freeDeliveryThreshold: { toString(): string } | null; serviceWeekdays: number[];
}): ZoneMatch {
  return {
    id: z.id,
    code: z.code,
    name: z.name,
    deliveryFee: z.deliveryFee.toString(),
    minOrderValue: z.minOrderValue.toString(),
    freeDeliveryThreshold: z.freeDeliveryThreshold?.toString() ?? null,
    serviceWeekdays: z.serviceWeekdays,
  };
}

function extractRing(polygon: unknown): [number, number][] | null {
  if (!polygon || typeof polygon !== "object") return null;
  const geo = polygon as { type?: string; coordinates?: unknown };
  if (geo.type !== "Polygon" || !Array.isArray(geo.coordinates)) return null;
  const ring = geo.coordinates[0];
  return Array.isArray(ring) ? (ring as [number, number][]) : null;
}
