import { Module } from "@nestjs/common";
import { ZoneService } from "./zone.service.js";

@Module({ providers: [ZoneService], exports: [ZoneService] })
export class DeliveryModule {}
