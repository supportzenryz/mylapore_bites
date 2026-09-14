import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { NotificationModule } from "../notifications/notification.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { OtpService } from "./otp.service.js";
import { TokenService } from "./token.service.js";
import { ReferenceService } from "./reference.service.js";

@Module({
  imports: [JwtModule.register({}), NotificationModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, ReferenceService],
  exports: [AuthService, TokenService, ReferenceService, JwtModule],
})
export class AuthModule {}
