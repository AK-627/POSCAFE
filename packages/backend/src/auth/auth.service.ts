import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthPayload, User } from '@skynether/shared/types/user';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const userEntity = await this.usersService.findByEmail(email);
    if (!userEntity || !userEntity.isActive) {
      return null;
    }

    const verified = await argon2.verify(userEntity.passwordHash, password);
    if (!verified) {
      return null;
    }

    return this.usersService.toDto(userEntity);
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AuthPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    await this.usersService.updateLastLogin(user.id);

    const tokens = this.generateTokenPair(payload);

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      ...tokens,
      user,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<AuthPayload & { type?: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Verify this is a refresh token, not an access token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify user still exists and is active
      const userEntity = await this.usersService.findByEmail(payload.email);
      if (!userEntity || !userEntity.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload: AuthPayload = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      };

      return this.generateTokenPair(newPayload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokenPair(payload: AuthPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiry') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiry') || '7d',
      },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async getProfile(userId: string): Promise<User | null> {
    const userEntity = await this.usersService.findById(userId);
    if (!userEntity) {
      return null;
    }
    return this.usersService.toDto(userEntity);
  }
}
