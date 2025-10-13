import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PromptPayload {
  system?: string;
  deconstruct?: string;
  analyze?: string;
  rewriteStructure?: string;
  rewriteStyle?: string;
  rewriteHook?: string;
  rewriteMixed?: string;
  optimize?: string;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 检查是否已有提示词配置
      const existing = await this.prisma.setting.findMany({
        where: { key: { in: ['prompt.system', 'prompt.deconstruct', 'prompt.analyze', 'prompt.rewriteStructure', 'prompt.rewriteStyle', 'prompt.rewriteHook', 'prompt.rewriteMixed', 'prompt.optimize'] } },
      });
      
      const existingKeys = new Set(existing.map(e => e.key));
      
      // 定义默认提示词
      const defaults: PromptPayload = {
        system: '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。',
        deconstruct: '请帮我分析这段文案的核心话题、吸引人的开头钩子、文案中的金句亮点、广告植入方式等关键要素。\n\n文案内容：\n{{content}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "topic": "核心话题",\n  "hook": "开头钩子",\n  "goldenSentence": "金句亮点",\n  "adPlacement": "广告植入方式",\n  "content": "核心内容总结",\n  "tags": ["标签1", "标签2"]\n}',
        analyze: '请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及可以改进的建议。\n\n文案内容：\n{{content}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "topic": "核心话题",\n  "hook": "开头钩子",\n  "goldenSentence": "金句",\n  "adPlacement": "广告植入",\n  "fireReasons": ["火的原因1", "火的原因2", "火的原因3"],\n  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]\n}',
        rewriteStructure: '请严格保持参考文案的段落结构、句式长度和节奏，只替换核心内容和细节描述。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
        rewriteStyle: '请学习参考文案的语气、用词风格、表达方式和情绪基调，用新内容创作一个风格相同的文案。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
        rewriteHook: '请重点学习参考文案的开头钩子设计和吸引用户的方式，用新内容创作一个同样吸引人的文案。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
        rewriteMixed: '请综合考虑参考文案的结构、风格和钩子，灵活组合创作，在保持核心吸引力的同时融入新内容。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
        optimize: '请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：\n1. 开头钩子是否足够吸引人\n2. 语言表达是否简洁有力\n3. 情感共鸣是否强烈\n4. 行动号召是否明确\n\n原文案：\n{{content}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "optimizedContent": "优化后的完整文案",\n  "improvements": ["改进点1", "改进点2", "改进点3"],\n  "highlights": ["亮点1", "亮点2"]\n}',
      };
      
      // 检查并补充缺失的提示词
      const needsInit: PromptPayload = {};
      if (!existingKeys.has('prompt.system')) needsInit.system = defaults.system;
      if (!existingKeys.has('prompt.deconstruct')) needsInit.deconstruct = defaults.deconstruct;
      if (!existingKeys.has('prompt.analyze')) needsInit.analyze = defaults.analyze;
      if (!existingKeys.has('prompt.rewriteStructure')) needsInit.rewriteStructure = defaults.rewriteStructure;
      if (!existingKeys.has('prompt.rewriteStyle')) needsInit.rewriteStyle = defaults.rewriteStyle;
      if (!existingKeys.has('prompt.rewriteHook')) needsInit.rewriteHook = defaults.rewriteHook;
      if (!existingKeys.has('prompt.rewriteMixed')) needsInit.rewriteMixed = defaults.rewriteMixed;
      if (!existingKeys.has('prompt.optimize')) needsInit.optimize = defaults.optimize;
      
      if (Object.keys(needsInit).length > 0) {
        this.logger.log(`检测到缺失的提示词配置，开始初始化 ${Object.keys(needsInit).length} 项`);
        await this.savePrompts(needsInit);
        this.logger.log('提示词配置初始化完成');
      } else {
        this.logger.log(`已有完整的提示词配置（${existing.length} 条），跳过初始化`);
      }
    } catch (error) {
      this.logger.error('初始化默认提示词配置失败');
      // 不抛出异常，避免影响应用启动
    }
  }

  async getPrompts(): Promise<PromptPayload> {
    // 兜底默认值（为空），避免任何硬编码提示词出现在系统中
    const fallback: PromptPayload = {};

    try {
      const keys = ['prompt.system', 'prompt.deconstruct', 'prompt.analyze', 'prompt.rewriteStructure', 'prompt.rewriteStyle', 'prompt.rewriteHook', 'prompt.rewriteMixed', 'prompt.optimize'];
      const rows = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
      const map = new Map(rows.map(r => [r.key, r.value]));

      this.logger.debug(`成功获取提示词配置，共 ${rows.length} 条记录`);

      return {
        system: (map.get('prompt.system') || fallback.system) as string,
        deconstruct: (map.get('prompt.deconstruct') || fallback.deconstruct) as string,
        analyze: (map.get('prompt.analyze') || fallback.analyze) as string,
        rewriteStructure: (map.get('prompt.rewriteStructure') || fallback.rewriteStructure) as string,
        rewriteStyle: (map.get('prompt.rewriteStyle') || fallback.rewriteStyle) as string,
        rewriteHook: (map.get('prompt.rewriteHook') || fallback.rewriteHook) as string,
        rewriteMixed: (map.get('prompt.rewriteMixed') || fallback.rewriteMixed) as string,
        optimize: (map.get('prompt.optimize') || fallback.optimize) as string,
      };
    } catch (error) {
      this.logger.error('获取提示词配置失败，返回默认提示词以保证前端可用');
      // 返回默认值，避免 500 影响前端页面加载
      return fallback;
    }
  }

  async savePrompts(payload: PromptPayload): Promise<void> {
    try {
      const entries: [string, string | undefined][] = [
        ['prompt.system', payload.system],
        ['prompt.deconstruct', payload.deconstruct],
        ['prompt.analyze', payload.analyze],
        ['prompt.rewriteStructure', payload.rewriteStructure],
        ['prompt.rewriteStyle', payload.rewriteStyle],
        ['prompt.rewriteHook', payload.rewriteHook],
        ['prompt.rewriteMixed', payload.rewriteMixed],
        ['prompt.optimize', payload.optimize],
      ];

      this.logger.log(`开始保存提示词配置，共 ${entries.filter(([_, v]) => typeof v === 'string').length} 项`);

      for (const [key, value] of entries) {
        if (typeof value === 'string') {
          await this.prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
          this.logger.debug(`已保存配置项: ${key}`);
        }
      }

      this.logger.log('提示词配置保存成功');
    } catch (error) {
      this.logger.error('保存提示词配置失败');
      
      // 提供更具体的错误信息
      if (error.code === 'P2002') {
        throw new InternalServerErrorException('数据库唯一性约束冲突，请联系管理员');
      } else if (error.code?.startsWith('P')) {
        throw new InternalServerErrorException(`数据库操作失败: ${error.message}`);
      } else if (error.message?.includes('connect')) {
        throw new InternalServerErrorException('无法连接到数据库，请检查数据库服务是否正常运行');
      } else {
        throw new InternalServerErrorException(`保存提示词配置时发生错误: ${error.message}`);
      }
    }
  }

  /**
   * 获取用户数据统计
   * 包括每个用户上传的素材数量和创作的文案数量
   */
  async getUserDataStats() {
    try {
      this.logger.log('开始获取用户数据统计');
      
      // 获取所有用户
      const users = await this.prisma.user.findMany({
        where: {
          role: 'user', // 只统计普通用户
        },
        select: {
          id: true,
          username: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 为每个用户统计数据
      const userStats = await Promise.all(
        users.map(async (user) => {
          // 统计用户分享的素材数量（shareStatus 为 approved 的文案）
          const materialCount = await this.prisma.copywriting.count({
            where: {
              userId: user.id,
              shareStatus: 'approved',
            },
          });

          // 统计用户创作保存的文案数量（所有文案）
          const copywritingCount = await this.prisma.copywriting.count({
            where: {
              userId: user.id,
            },
          });

          return {
            id: user.id,
            username: user.username,
            status: user.status,
            createdAt: user.createdAt,
            materialCount, // 上传素材数量
            copywritingCount, // 创作文案数量
          };
        })
      );

      this.logger.log(`成功获取 ${userStats.length} 个用户的数据统计`);
      return userStats;
    } catch (error) {
      this.logger.error('获取用户数据统计失败', error);
      throw new InternalServerErrorException('获取用户数据统计失败');
    }
  }
}


