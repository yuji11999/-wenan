import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        const logger = new Logger('JwtModule');

        if (!secret) {
          logger.error('❌ JWT_SECRET 未配置');
          logger.error('请在.env文件中配置JWT_SECRET');
          throw new Error('JWT_SECRET 未配置，无法启动认证模块');
        }

        if (secret === 'your-secret-key-change-this-in-production') {
          logger.warn('⚠️  JWT_SECRET 使用默认值，生产环境请修改为安全的密钥');
        }

        return {
          secret,
          signOptions: {
            expiresIn: config.get('JWT_EXPIRES_IN', '7d'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}





