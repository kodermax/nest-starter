import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtDto } from '../dto/jwt.dto';
import { User } from '@prisma/client';
import { PasswordService } from './password.service';
import { RedisService } from 'src/app/redis/redis.service';
import { SecurityConfig } from 'src/app/common/configs/config.interface';
import { Token } from '../models/token.model';
import { PrismaService } from 'src/app/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../models/jwt-payload';
import { RequestUser } from '../interfaces/user';

@Injectable()
export class AuthService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly cacheManager: RedisService,
    ) { }

    public getAuthCookies(accessToken: string, refreshToken: string) {
        return {
            accessToken: `Authentication=${accessToken}; HttpOnly; Domain=${this.getCookieDomain()}; ${this.config.get('SECURE_COOKIE') === 'true' ?
                'SameSite=None;' : ''
                } ${this.config.get('SECURE_COOKIE') === 'true' ? 'Secure;' : ''} Path=/; Max-Age=${this.config.get<SecurityConfig>('security').expiresIn}`,
            refreshToken: `Refresh=${refreshToken}; HttpOnly; Domain=${this.getCookieDomain()}; ${this.config.get('SECURE_COOKIE') === 'true'
                ? 'SameSite=None;' : ''
                } ${this.config.get('SECURE_COOKIE') === 'true' ? 'Secure;' : ''} Path=/; Max-Age=${this.config.get<SecurityConfig>('security').refreshIn}`
        }
    }
    public getCookieWithJwtAccessToken(user: RequestUser) {
        const payload: JwtPayload = {
            jti: randomUUID(),
            aud: this.config.get('siteUrl'),
            sub: user.id,
            roles: user.roles,
        };
        const token = this.generateAccessToken(payload);
        return `Authentication=${token}; HttpOnly; Domain=${this.getCookieDomain()}; ${this.getCookieDomain() !== 'localhost' ?
            'SameSite=None;' : ''
            } ${this.getCookieDomain() !== 'localhost' ? 'Secure;' : ''} Path=/; Max-Age=${this.config.get<SecurityConfig>('security').expiresIn}`;
    }

    public getCookieWithJwtRefreshToken(user: RequestUser) {
        const payload: JwtPayload = {
            jti: randomUUID(),
            aud: this.config.get('siteUrl'),
            sub: user.id,
            roles: user.roles,
        };
        const token = this.generateRefreshToken(payload);
        const cookie = `Refresh=${token}; HttpOnly; Domain=${this.getCookieDomain()}; ${this.getCookieDomain() !== 'localhost'
            ? 'SameSite=None;' : ''
            } ${this.getCookieDomain() !== 'localhost' ? 'Secure;' : ''} Path=/; Max-Age=${this.config.get<SecurityConfig>('security').refreshIn}`;
        return {
            cookie,
            token,
        };
    }
    public async getAuthUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new NotFoundException(`No user found for email: ${email}`);
        }
        const passwordValid = await this.passwordService.validatePassword(
            password,
            user.password
        );
        if (!passwordValid) {
            throw new ForbiddenException('???????????????? ????????????!');
        }
        user.password = undefined;
        return user;
    }

    public validateUser(userId: string): Promise<User> {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }

    public login(user: any) {
        const payload = { username: user.username, sub: user.userId };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    private getCookieDomain() {
        return this.config.get('AUTH_COOKIE_DOMAIN');
    }

    public async setCurrentRefreshToken(refreshToken: string, userId: string) {
        const currentHashedRefreshToken = await this.passwordService.hashPassword(refreshToken);
        await this.cacheManager.set(`refresh_token:${userId}`, currentHashedRefreshToken, {
            ttl: this.config.get<SecurityConfig>('security').refreshIn * 1000,
        });
    }
    private generateAccessToken(payload: JwtPayload): string {
        return this.jwtService.sign(payload, {
            secret: this.config.get('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: this.config.get<SecurityConfig>('security').expiresIn
        });
    }

    private generateRefreshToken(payload: JwtPayload): string {
        return this.jwtService.sign(payload, {
            secret: this.config.get('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: this.config.get<SecurityConfig>('security').refreshIn
        });
    }
    public generateTokens(user: RequestUser): Token {
        const payload: JwtPayload = {
            jti: randomUUID(),
            aud: this.config.get('siteUrl'),
            sub: user.id,
            roles: user.roles,
        };
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
        };
    }

    public async removeRefreshToken(userId: string) {
        return this.cacheManager.del(`refresh_token:${userId}`);
    }

    public getCookiesForLogOut() {
        return [
            `Authentication=; HttpOnly; Domain=${this.getCookieDomain()}; ${this.getCookieDomain() !== 'localhost' ?
                'SameSite=None;Secure;' : ''
            } Path=/; Max-Age=0`,
            `Refresh=; HttpOnly; Domain=${this.getCookieDomain()}; ${this.getCookieDomain() !== 'localhost' ? 'SameSite=None;Secure;' : ''
            } Path=/; Max-Age=0`,
        ];
    }
}