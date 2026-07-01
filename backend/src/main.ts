import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { CategoryService } from './category/category.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.trim().length < 16) {
      logger.error('❌ ENCRYPTION_KEY 未配置或长度不足，无法安全保存/读取AI API Key');
      process.exit(1);
    }

    // 全局异常过滤器
    app.useGlobalFilters(new AllExceptionsFilter());

    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    // CORS配置（从环境变量读取，或使用默认值）
    const corsOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });

    // Swagger API文档
    const config = new DocumentBuilder()
      .setTitle('短视频文案系统 API')
      .setDescription('短视频文案创作辅助系统的后端API接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);

    logger.log(`🚀 Server is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
    logger.log(`🌐 CORS Origins: ${corsOrigins.join(', ')}`);

    // 可选：初始化默认分类（通过环境变量控制，默认关闭）
    try {
      const shouldInitCategories = process.env.INIT_DEFAULT_CATEGORIES === 'true';
      if (shouldInitCategories) {
        const categoryService = app.get(CategoryService);
        await categoryService.initDefaultCategories();
        logger.log('✅ 默认分类初始化完成');
      } else {
        logger.log('⏭️ 已跳过默认分类初始化（INIT_DEFAULT_CATEGORIES !== "true"）');
      }
    } catch (error) {
      logger.warn(`⚠️  默认分类初始化失败: ${error?.message || error}`);
    }

    // 检查关键配置
    const dbUrl = process.env.DATABASE_URL;
    const jwtSecret = process.env.JWT_SECRET;

    // AI服务统一使用管理员在数据库中激活的全局配置
    let hasActiveAiConfig = false;
    try {
      const prisma = app.get(PrismaService);
      const active = await prisma.aIConfig.findFirst({
        where: { isActive: true },
        select: { id: true, provider: true, model: true }
      });
      hasActiveAiConfig = !!active;
      if (hasActiveAiConfig && active) {
        logger.log(`ℹ️ 检测到数据库中的激活AI配置：${active.provider} - ${active.model}`);
      }
    } catch (e) {
      logger.warn(`⚠️  无法检查数据库中的AI配置：${e?.message || e}`);
    }

    logger.log('=== 配置检查 ===');
    logger.log(`数据库: ${dbUrl ? '✅ 已配置' : '❌ 未配置'}`);
    logger.log(`AI服务: ${hasActiveAiConfig ? '✅ 已配置' : '⚠️  未配置（AI功能将不可用）'}`);
    logger.log(`JWT密钥: ${jwtSecret ? '✅ 已配置' : '❌ 未配置'}`);
    logger.log(`AI密钥加密: ${encryptionKey && encryptionKey.trim().length >= 16 ? '✅ 已配置' : '❌ 未配置或长度不足'}`);

    if (!dbUrl) {
      logger.error('❌ DATABASE_URL 未配置，请在.env文件中配置数据库连接');
    }
    if (!jwtSecret || jwtSecret === 'your-secret-key-change-this-in-production') {
      logger.warn('⚠️  JWT_SECRET 使用默认值，生产环境请修改为安全的密钥');
    }
    if (!encryptionKey || encryptionKey.trim().length < 16) {
      logger.error('❌ ENCRYPTION_KEY 未配置或长度不足，无法安全保存/读取AI API Key');
    }
    if (!hasActiveAiConfig) {
      logger.warn('⚠️  未发现管理员激活的AI配置，AI功能将不可用');
      logger.warn('   请管理员在前端系统设置中配置并激活AI服务');
    }

  } catch (error) {
    logger.error('❌ 应用启动失败:', error.message);
    logger.error('请检查配置文件和依赖服务');
    process.exit(1);
  }
}
bootstrap();



