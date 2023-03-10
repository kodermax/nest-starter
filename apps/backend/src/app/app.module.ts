import { PasswordService } from './auth/services/password.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { AccountsModule } from './accounts/accounts.module';
import { PrismaModule } from './prisma/prisma.module';
import config from './common/configs/config';
import configProd from './common/configs/config.prod';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => config.get('throttle'),
  }),
    AuthModule, AccountsModule,
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env', '.env.local'],
    load: [process.env.NODE_ENV === 'production' ? configProd : config]
  }), RedisModule, PrismaModule],
  controllers: [AppController],
  providers: [
    PasswordService, AppService],
})
export class AppModule { }
