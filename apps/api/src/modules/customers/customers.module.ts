import { Module } from "@nestjs/common";
import { DeliveryModule } from "../delivery/delivery.module.js";
import { CustomerController } from "./customer.controller.js";
import { CustomerService } from "./customer.service.js";

@Module({
  imports: [DeliveryModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomersModule {}
