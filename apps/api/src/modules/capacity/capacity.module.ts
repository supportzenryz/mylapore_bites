import { Module } from "@nestjs/common";
import { CapacityRepository } from "./capacity.repository.js";
import { CapacityService } from "./capacity.service.js";

@Module({
  providers: [CapacityRepository, CapacityService],
  exports: [CapacityRepository, CapacityService],
})
export class CapacityModule {}
