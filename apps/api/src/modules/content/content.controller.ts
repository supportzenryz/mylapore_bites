import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/public.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

export interface HomeContent {
  hero: { headline: string; subhead: string; primaryCta: string; secondaryCta: string };
  settings: Record<string, unknown>;
}

@Controller("content")
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Homepage copy lives in settings so the owner can change the tagline
   * without a deploy. Defaults exist so a fresh database still renders.
   */
  @Public()
  @Get("home")
  async home(@CurrentMarket() market: ResolvedMarket): Promise<HomeContent> {
    const rows = await this.prisma.setting.findMany({
      where: { marketId: market.id, isPublic: true },
      select: { key: true, value: true },
    });
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const str = (key: string, fallback: string): string =>
      typeof settings[key] === "string" ? (settings[key] as string) : fallback;

    return {
      hero: {
        headline: str("homepage.heroHeadline", "Made Fresh. From Mylapore. To Your Door."),
        subhead: str(
          "homepage.heroSubhead",
          "Traditional South Indian foods prepared fresh in Mylapore and delivered to your home.",
        ),
        primaryCta: str("homepage.primaryCta", "Pre-order now"),
        secondaryCta: str("homepage.secondaryCta", "Explore the menu"),
      },
      settings,
    };
  }
}
