import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAIConfigDto } from './dto/create-ai-config.dto';
import { UpdateAIConfigDto } from './dto/update-ai-config.dto';
import * as crypto from 'crypto';
import axios from 'axios';
import { assertSafeHttpUrl, createSafeAxiosAgents } from '../common/safe-url';
import { PUBLIC_AI_MODEL_FETCH_ERROR } from '../common/ai-error';

export interface AIProbeOptions {
  configId?: string;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface AIModelOption {
  label: string;
  value: string;
  description: string;
}

const ACTIVE_CONFIG_SETTING_KEY = 'ai.activeConfigId';

@Injectable()
export class AiConfigService {
  constructor(private prisma: PrismaService) {}

  // 生成 32 字节密钥：对任意长度的字符串做 SHA-256，保证长度正确
  private deriveKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.trim().length < 16) {
      throw new Error('ENCRYPTION_KEY 未配置或长度不足，无法安全保存AI API Key');
    }
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
      throw new Error('AI API Key 解密失败，请重新保存配置');
    }
  }

  // 创建AI配置
  async create(userId: string, createDto: CreateAIConfigDto) {
    await assertSafeHttpUrl(createDto.baseUrl);

    // 加密API Key
    const encryptedApiKey = this.encryptApiKey(createDto.apiKey);

    const createConfig = async (tx: PrismaService) => tx.aIConfig.create({
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
        apiKey: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const created = createDto.isActive
      ? await this.prisma.$transaction(async (tx) => {
          await tx.aIConfig.updateMany({
            where: {},
            data: { isActive: false },
          });
          const config = await createConfig(tx as PrismaService);
          await tx.setting.upsert({
            where: { key: ACTIVE_CONFIG_SETTING_KEY },
            update: { value: config.id },
            create: { key: ACTIVE_CONFIG_SETTING_KEY, value: config.id },
          });
          return config;
        })
      : await createConfig(this.prisma);
    return this.redactConfig(created);
  }

  private redactConfig<T extends { apiKey?: string | null }>(config: T) {
    const { apiKey, ...rest } = config;
    if (!apiKey) {
      return {
        ...rest,
        hasApiKey: false,
      };
    }

    try {
      this.decryptApiKey(apiKey);
    } catch {
      return {
        ...rest,
        hasApiKey: false,
        needsRekey: true,
      };
    }

    return {
      ...rest,
      hasApiKey: true,
    };
  }

  private async resolveProbeOptions(options: AIProbeOptions) {
    if (options.configId) {
      const config = await this.prisma.aIConfig.findFirst({
        where: { id: options.configId },
      });

      if (!config) {
        throw new NotFoundException('配置不存在');
      }

      await assertSafeHttpUrl(config.baseUrl);

      return {
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey: this.decryptApiKey(config.apiKey),
      };
    }

    const provider = options.provider?.trim();
    const baseUrl = options.baseUrl?.trim();
    const apiKey = options.apiKey?.trim();

    if (!provider || !baseUrl || !apiKey) {
      throw new BadRequestException('测试连接需要提供服务商、API地址和API Key');
    }

    await assertSafeHttpUrl(baseUrl);

    return { provider, baseUrl, apiKey };
  }

  private async getActiveConfigId() {
    const setting = await this.prisma.setting.findUnique({
      where: { key: ACTIVE_CONFIG_SETTING_KEY },
    });
    return setting?.value || '';
  }

  private withActiveFlag<T extends { id?: string; isActive?: boolean }>(config: T, activeConfigId: string) {
    if (!activeConfigId || !config?.id) {
      return config;
    }
    return {
      ...config,
      isActive: config.id === activeConfigId,
    };
  }

  private buildModelRequestCandidates(provider: string, baseUrl: string, apiKey: string) {
    const base = baseUrl.replace(/\/$/, '');

    if (provider === 'gemini') {
      const root = base.replace(/\/v1(beta)?$/, '');
      const officialHeaders = { 'x-goog-api-key': apiKey };
      const compatibleHeaders = { Authorization: `Bearer ${apiKey}` };

      if (/generativelanguage\.googleapis\.com/i.test(base)) {
        return [
          { url: `${root}/v1/models`, headers: officialHeaders },
          { url: `${root}/v1beta/models`, headers: officialHeaders },
        ];
      }

      return [
        { url: `${base}/models`, headers: compatibleHeaders },
        { url: `${root}/v1/models`, headers: officialHeaders },
        { url: `${root}/v1beta/models`, headers: officialHeaders },
      ];
    }

    return [
      { url: `${base}/models`, headers: { Authorization: `Bearer ${apiKey}` } },
      { url: `${base}/models`, headers: { 'X-API-Key': apiKey } },
      { url: `${base}/models`, headers: { 'x-api-key': apiKey } },
      { url: `${base}/models`, headers: { 'api-key': apiKey } },
    ];
  }

  private parseModelList(data: any): AIModelOption[] {
    if (Array.isArray(data)) {
      return data
        .map((model: any) => {
          const id = model?.id || model?.name || (typeof model === 'string' ? model : '');
          if (!id) return null;
          return {
            label: model?.label || model?.displayName || model?.display_name || id,
            value: id,
            description: model?.description || '',
          };
        })
        .filter(Boolean);
    }

    if (Array.isArray(data?.data)) {
      return data.data
        .map((model: any) => {
          const id = model.id || model.name;
          if (!id) return null;
          return {
            label: model.display_name || model.name || id,
            value: id,
            description: model.description || '',
          };
        })
        .filter(Boolean);
    }

    if (Array.isArray(data?.models)) {
      return data.models
        .map((model: any) => {
          const id = (model.name || model.id || '').replace(/^models\//, '');
          if (!id) return null;
          const label = model.displayName || model.display_name || id;
          return {
            label,
            value: id,
            description: model.description || label,
          };
        })
        .filter(Boolean);
    }

    return [];
  }

  async fetchModels(options: AIProbeOptions): Promise<AIModelOption[]> {
    const { provider, baseUrl, apiKey } = await this.resolveProbeOptions(options);
    const candidates = this.buildModelRequestCandidates(provider, baseUrl, apiKey);
    let lastMessage = '无法获取模型列表';

    for (const candidate of candidates) {
      try {
        const response = await axios.get(candidate.url, {
          headers: candidate.headers,
          timeout: 30000,
          timeoutErrorMessage: 'AI模型列表请求超时',
          maxRedirects: 0,
          maxBodyLength: 1024 * 1024,
          maxContentLength: 1024 * 1024,
          ...createSafeAxiosAgents(),
        });
        const models = this.parseModelList(response.data);
        if (models.length > 0) {
          return models;
        }
        lastMessage = '模型列表为空或格式不支持';
      } catch (error) {
        lastMessage = PUBLIC_AI_MODEL_FETCH_ERROR;
      }
    }

    throw new Error(lastMessage);
  }

  async testConnection(options: AIProbeOptions) {
    const resolved = await this.resolveProbeOptions(options);
    try {
      const models = await this.fetchModels(resolved);
      return { connected: true, models };
    } catch (error) {
      return {
        connected: false,
        message: error.message || '连接测试失败',
      };
    }
  }

  // 获取所有AI配置（管理员全局配置）
  async findAll() {
    const activeConfigId = await this.getActiveConfigId();
    const configs = await this.prisma.aIConfig.findMany({
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        apiKey: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return configs.map((config) => this.redactConfig(this.withActiveFlag(config, activeConfigId)));
  }

  // 获取当前激活的全局配置
  async findActive() {
    const activeConfigId = await this.getActiveConfigId();
    let config = activeConfigId
      ? await this.prisma.aIConfig.findFirst({ where: { id: activeConfigId } })
      : null;

    if (!config) {
      config = await this.prisma.aIConfig.findFirst({
        where: { isActive: true },
      });
    }

    if (!config) {
      return null;
    }

    return this.redactConfig(this.withActiveFlag(config, config.id));
  }

  // 获取单个配置（不返回API Key明文）
  async findOne(id: string) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    return this.redactConfig(config);
  }

  // 更新AI配置
  async update(id: string, updateDto: UpdateAIConfigDto) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    if (updateDto.baseUrl) {
      await assertSafeHttpUrl(updateDto.baseUrl);
    }

    // 如果更新了API Key，需要加密
    const updateData: any = { ...updateDto };
    if (updateDto.apiKey && updateDto.apiKey.trim()) {
      updateData.apiKey = this.encryptApiKey(updateDto.apiKey);
    } else {
      delete updateData.apiKey;
    }

    const updateConfig = async (tx: PrismaService) => tx.aIConfig.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        provider: true,
        providerName: true,
        model: true,
        modelName: true,
        apiKey: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const updated = updateDto.isActive
      ? await this.prisma.$transaction(async (tx) => {
          await tx.aIConfig.updateMany({
            where: { id: { not: id } },
            data: { isActive: false },
          });
          const config = await updateConfig(tx as PrismaService);
          await tx.setting.upsert({
            where: { key: ACTIVE_CONFIG_SETTING_KEY },
            update: { value: id },
            create: { key: ACTIVE_CONFIG_SETTING_KEY, value: id },
          });
          return config;
        })
      : await updateConfig(this.prisma);
    return this.redactConfig(updated);
  }

  // 设置激活的配置
  async setActive(id: string) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.aIConfig.updateMany({
        where: {},
        data: { isActive: false },
      });

      const updatedConfig = await tx.aIConfig.update({
        where: { id },
        data: { isActive: true },
        select: {
          id: true,
          provider: true,
          providerName: true,
          model: true,
          modelName: true,
          apiKey: true,
          baseUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await tx.setting.upsert({
        where: { key: ACTIVE_CONFIG_SETTING_KEY },
        update: { value: id },
        create: { key: ACTIVE_CONFIG_SETTING_KEY, value: id },
      });
      return updatedConfig;
    });
    return this.redactConfig(updated);
  }

  // 删除AI配置
  async remove(id: string) {
    const config = await this.prisma.aIConfig.findFirst({
      where: { id },
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
