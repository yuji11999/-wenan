import { Module } from '@nestjs/common';
import { CopywritingService } from './copywriting.service';
import { CopywritingController } from './copywriting.controller';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [CopywritingController],
  providers: [CopywritingService],
  exports: [CopywritingService],
})
export class CopywritingModule {}




