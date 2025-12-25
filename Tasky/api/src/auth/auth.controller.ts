import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('request-reset')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) 
  async requestReset(@Body() dto: RequestResetDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.auth.verifyResetCode(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-password')
  async verifyPassword(@CurrentUser() user: any, @Body() dto: VerifyPasswordDto) {
    return this.auth.verifyPassword(user.userId, dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.auth.googleLogin(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, '');
    const redirectUrl = `${normalizedFrontendUrl}/#/auth/callback?accessToken=${encodeURIComponent(
      result.accessToken,
    )}&refreshToken=${encodeURIComponent(result.refreshToken)}`;
    res.redirect(redirectUrl);
  }
}
