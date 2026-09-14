import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { validateEnv } from "./config/env.schema.js";
import { PrismaModule } from "./common/prisma/prisma.module.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { MarketModule } from "./common/market/market.module.js";
import { MarketMiddleware } from "./common/market/market.middleware.js";
import { RbacModule } from "./common/rbac/rbac.module.js";
import { AllExceptionsFilter } from "./common/errors/all-exceptions.filter.js";
import { CustomerAuthGuard } from "./common/auth/customer-auth.guard.js";
import { AuditInterceptor } from "./common/audit/audit.interceptor.js";
import { IdempotencyInterceptor } from "./common/idempotency/idempotency.interceptor.js";

import { HealthModule } from "./modules/health/health.module.js";
import { MarketsModule } from "./modules/markets/markets.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { PricingModule } from "./modules/pricing/pricing.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CustomersModule } from "./modules/customers/customers.module.js";
import { NotificationModule } from "./modules/notifications/notification.module.js";
import { CapacityModule } from "./modules/capacity/capacity.module.js";
import { DeliveryModule } from "./modules/delivery/delivery.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { ContentModule } from "./modules/content/content.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    PrismaModule,
    RedisModule,
    MarketModule,
    RbacModule,
    HealthModule,
    MarketsModule,
    CatalogModule,
    PricingModule,
    AuthModule,
    CustomersModule,
    NotificationModule,
    CapacityModule,
    DeliveryModule,
    CartModule,
    ContentModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Fails closed: a route without @Public() requires a session.
    { provide: APP_GUARD, useClass: CustomerAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Market resolution runs before every route, including health.
    consumer.apply(MarketMiddleware).forRoutes("*");
  }
}
