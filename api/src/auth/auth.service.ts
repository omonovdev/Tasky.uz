import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Profile, PasswordResetToken, UserRole } from '../entities';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import * as nodemailer from 'nodemailer';

interface JwtPayload {
  sub: string;
  email?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    @InjectRepository(UserRole)
    private readonly roles: Repository<UserRole>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private async validatePassword(password: string, hash?: string | null) {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  private toSafeUser(user: Profile) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  private signTokens(payload: JwtPayload) {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const accessSecret =
      this.config.get<string>('JWT_ACCESS_SECRET') || 'access-secret';
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret';
    const accessToken = this.jwt.sign(payload, {
      secret: accessSecret,
      expiresIn: accessTtl as any,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshTtl as any,
    });
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.profiles.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.hashPassword(dto.password);
    const profile = this.profiles.create({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      passwordHash,
      dateOfBirth: dto.dateOfBirth ?? null,
    });
    const saved = await this.profiles.save(profile);

    const role = this.roles.create({ userId: saved.id, role: 'employee' });
    await this.roles.save(role);

    const tokens = this.signTokens({ sub: saved.id, email: saved.email });
    return { user: this.toSafeUser(saved), ...tokens };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.profiles
      .createQueryBuilder('p')
      .addSelect('p.passwordHash')
      .where('p.email = :email', { email })
      .getOne();
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await this.validatePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = this.signTokens({ sub: user.id, email: user.email });
    return { user: this.toSafeUser(user), ...tokens };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret:
          this.config.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
      });
      const user = await this.profiles.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');
      const tokens = this.signTokens({ sub: user.id, email: user.email });
      return { user: this.toSafeUser(user), ...tokens };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private transporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs in dev
      },
    });
  }

  async requestPasswordReset(dto: RequestResetDto) {
    const user = await this.profiles.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.email) return { success: true };

    // 6-digit code instead of URL token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await this.resetTokens.save(
      this.resetTokens.create({
        userId: user.id,
        token,
        expiresAt,
        used: false,
      }),
    );

    // DEVELOPMENT: Log the token to console
    console.log('\n========================================');
    console.log('🔑 PASSWORD RESET CODE GENERATED');
    console.log('========================================');
    console.log(`Email: ${user.email}`);
    console.log(`Code: ${token}`);
    console.log(`Expires: ${expiresAt.toLocaleString()}`);
    console.log('========================================\n');

    const transporter = this.transporter();
    const from = this.config.get<string>('SMTP_FROM', 'no-reply@tasky.uz');

    if (transporter) {
      try {
        await transporter.sendMail({
          from,
          to: user.email,
          subject: 'Tasky Password Reset Code',
          text: `Your Tasky reset code: ${token}. It expires in 30 minutes.`,
          html: `<p>Your Tasky reset code:</p><p><strong style="font-size:20px;">${token}</strong></p><p>This code expires in 30 minutes.</p>`,
        });
        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError.message);
        // Don't throw - we still want to return success so user can use the token
        // The token is saved in DB, so it can be used even if email fails
      }
    } else {
      console.warn('SMTP not configured, password reset token generated but email not sent');
    }
    return { success: true };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const now = new Date();
    const token = await this.resetTokens.findOne({
      where: { token: dto.token, used: false, expiresAt: MoreThan(now) },
    });

    if (!token) {
      throw new BadRequestException('Invalid or expired code');
    }

    return { success: true, valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const now = new Date();
    const token = await this.resetTokens.findOne({
      where: { token: dto.token, used: false, expiresAt: MoreThan(now) },
    });
    if (!token) throw new BadRequestException('Invalid or expired token');

    const user = await this.profiles.findOne({ where: { id: token.userId } });
    if (!user) throw new BadRequestException('User not found');

    user.passwordHash = await this.hashPassword(dto.newPassword);
    await this.profiles.save(user);

    token.used = true;
    await this.resetTokens.save(token);

    const tokens = this.signTokens({ sub: user.id, email: user.email });
    return { user: this.toSafeUser(user), ...tokens };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.profiles
      .createQueryBuilder('p')
      .addSelect('p.passwordHash')
      .where('p.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await this.validatePassword(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid current password');

    user.passwordHash = await this.hashPassword(dto.newPassword);
    await this.profiles.save(user);
    return { success: true };
  }

  async verifyPassword(userId: string, dto: VerifyPasswordDto) {
    const user = await this.profiles
      .createQueryBuilder('p')
      .addSelect('p.passwordHash')
      .where('p.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await this.validatePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid current password');

    return { success: true };
  }

  async googleLogin(user: any) {
    if (!user) throw new UnauthorizedException('No user from Google');

    const email = user.email.toLowerCase();
    let profile = await this.profiles.findOne({ where: { email } });

    if (!profile) {
      // Create new user from Google data
      profile = this.profiles.create({
        email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        passwordHash: null, // No password for OAuth users
        dateOfBirth: null,
      });
      profile = await this.profiles.save(profile);

      const role = this.roles.create({ userId: profile.id, role: 'employee' });
      await this.roles.save(role);
    }

    const tokens = this.signTokens({ sub: profile.id, email: profile.email });
    return { user: this.toSafeUser(profile), ...tokens };
  }
}
