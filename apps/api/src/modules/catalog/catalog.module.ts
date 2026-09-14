import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module.js";
import { CatalogController } from "./catalog.controller.js";
import { CategoryService } from "./category.service.js";
import { ProductService } from "./product.service.js";

@Module({
  imports: [PricingModule],
  controllers: [CatalogController],
  providers: [CategoryService, ProductService],
  exports: [CategoryService, ProductService],
})
export class CatalogModule {}
