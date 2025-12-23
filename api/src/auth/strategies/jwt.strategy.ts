import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../../entities';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'access-secret',
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('Invalid token');

    const exists = await this.profiles.exist({ where: { id: userId } });
    if (!exists) throw new UnauthorizedException('User not found');

    return { userId, email: payload.email };
  }
}
