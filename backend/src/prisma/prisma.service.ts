import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ 数据库连接成功');
    } catch (error) {
      this.logger.error('❌ 数据库连接失败:', error.message);
      this.logger.error('请检查以下配置:');
      this.logger.error('1. DATABASE_URL 环境变量是否正确配置');
      this.logger.error('2. 数据库服务是否正常运行');
      this.logger.error('3. 数据库用户名和密码是否正确');
      this.logger.error('4. 数据库名称是否存在');
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接已关闭');
  }
}





