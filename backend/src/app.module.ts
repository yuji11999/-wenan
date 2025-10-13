import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CopywritingModule } from './copywriting/copywriting.module';
import { AiModule } from './ai/ai.module';
import { CategoryModule } from './category/category.module';
import { SettingsModule } from './settings/settings.module';
import { AiConfigModule } from './ai-config/ai-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CopywritingModule,
    AiModule,
    CategoryModule,
    SettingsModule,
    AiConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}




