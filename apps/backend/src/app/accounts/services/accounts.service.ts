/*
https://docs.nestjs.com/providers#services
*/

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PasswordService } from 'src/app/auth/services/password.service';
import { RegisterInput } from '../dto/register.input';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/app/prisma/prisma.service';
import { UsersService } from 'src/app/users/users.service';
import crypto from 'crypto';
import { RedisService } from 'src/app/redis/redis.service';
import { MailService } from 'src/app/mail/mail.service';

@Injectable()
export class AccountsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly usersServices: UsersService,
        private readonly cacheManager: RedisService,
        private readonly mailService: MailService
    ) { }

    public async requestPasswordReset(email: string) {
        const user = await this.usersServices.getUserByEmail(email);
        if (!user) {
            throw new NotFoundException();
        }
        const token = crypto.randomBytes(24).toString('hex');
        await this.cacheManager.set(`reset_token:${token}`, user.id, { ttl: 3600000 });
        this.mailService.sendPasswordReset(user.firstName, user.email, token);
    }

    public async createUser(payload: RegisterInput): Promise<User> {
        const hashedPassword = await this.passwordService.hashPassword(
            payload.password
        );

        try {
            const user = await this.prisma.user.create({
                data: {
                    ...payload,
                    password: hashedPassword,
                    role: 'USER',
                },
            });
            return user;
        } catch (e) {
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
            ) {
                throw new ConflictException(`Email ${payload.email} already used.`);
            }
            throw new Error(e);
        }
    }

}
