import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAIConfigDto } from './dto/create-ai-config.dto';
import { UpdateAIConfigDto } from './dto/update-ai-config.dto';
import * as crypto from 'crypto';

@Injectable()
export class AiConfigService {
  constructor(private prisma: PrismaService) {}

  // 生成 32 字节密钥：对任意长度的字符串做 SHA-256，保证长度正确
  private deriveKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || 'default-secret';
    return crypto.createHash('sha256').update(secret, 'utf8').digest(); // 32 bytes
  }

  // 加密API Key
  private encryptApiKey(apiKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.deriveKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // 解密API Key
  private decryptApiKey(encryptedApiKey: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.deriveKey();
      const parts = encryptedApiKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      // 如果解密失败，可能是旧数据未加密，直接返回
      return encryptedApiKey;
    }
  }

  // 创建AI配置
  async create(userId: string, createDto: CreateAIConfigDto) {
    // 如果设置为激活，先将该用户的其他配置设为非激活
    if (createDto.isActive) {
      await this.prisma.aIConfig.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    // 加密API Key
    const encryptedApiKey = this.encryptApiKey(createDto.apiKey);

    return this.prisma.aIConfig.create({
      data: {
        userId,
        provider: createDto.provider,
        providerName: createDto.providerName,
        model: createDto.model,
        modelName: createDto.modelName,
        apiKey: encryptedApiKey,
        baseUrl: createDto.baseUrl,
        isActive: createDto.isActive ?? false,
      },
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // 获取用户的所有AI配置
  async findAll(userId: string) {
    return this.prisma.aIConfig.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 获取用户当前激活的配置
  async findActive(userId: string) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { userId, isActive: true },
    });

    if (!config) {
      return null;
    }

    // 解密API Key后返回
    return {
      ...config,
      apiKey: this.decryptApiKey(config.apiKey),
    };
  }

  // 获取单个配置（包含解密后的API Key）
  async findOne(userId: string, id: string) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { id, userId },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    // 解密API Key后返回
    return {
      ...config,
      apiKey: this.decryptApiKey(config.apiKey),
    };
  }

  // 更新AI配置
  async update(userId: string, id: string, updateDto: UpdateAIConfigDto) {
    // 验证配置是否属于当前用户
    const config = await this.prisma.aIConfig.findFirst({
      where: { id, userId },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    // 如果设置为激活，先将该用户的其他配置设为非激活
    if (updateDto.isActive) {
      await this.prisma.aIConfig.updateMany({
        where: { userId, id: { not: id } },
        data: { isActive: false },
      });
    }

    // 如果更新了API Key，需要加密
    const updateData: any = { ...updateDto };
    if (updateDto.apiKey) {
      updateData.apiKey = this.encryptApiKey(updateDto.apiKey);
    }

    return this.prisma.aIConfig.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // 设置激活的配置
  async setActive(userId: string, id: string) {
    // 验证配置是否属于当前用户
    const config = await this.prisma.aIConfig.findFirst({
      where: { id, userId },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    // 将该用户的其他配置设为非激活
    await this.prisma.aIConfig.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // 设置当前配置为激活
    return this.prisma.aIConfig.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // 删除AI配置
  async remove(userId: string, id: string) {
    // 验证配置是否属于当前用户
    const config = await this.prisma.aIConfig.findFirst({
      where: { id, userId },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    await this.prisma.aIConfig.delete({
      where: { id },
    });

    return { message: '配置已删除' };
  }
}
