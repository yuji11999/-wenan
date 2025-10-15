import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateCopywritingDto } from './dto/create-copywriting.dto';
import { DeconstructDto } from './dto/deconstruct.dto';
import { AnalyzeDto } from './dto/analyze.dto';
import { RewriteDto } from './dto/rewrite.dto';

@Injectable()
export class CopywritingService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  // 文案拆解（只进行AI分析，不保存到数据库）
  async deconstruct(userId: string, deconstructDto: DeconstructDto, headers?: any) {
    const { content, videoUrl, industry } = deconstructDto;

    // 从请求头读取可选的AI配置覆盖项
    const aiOpts = {
      apiKey: headers?.['x-ai-key'] || headers?.['X-AI-Key'],
      baseUrl: headers?.['x-ai-base-url'] || headers?.['X-AI-Base-Url'],
      model: headers?.['x-ai-model'] || headers?.['X-AI-Model'],
    };

    // 调用AI进行拆解，只返回分析结果，不保存
    const analysis = await this.aiService.deconstructCopywriting(content, aiOpts);

    // 返回分析结果，附加用户提供的信息
    return {
      analysis: {
        ...analysis,
        originalText: content,
        videoUrl: videoUrl || '',
        industry: industry || 'other',
      }
    };
  }

  // 保存拆解结果到数据库
  async saveDeconstruction(userId: string, data: any) {
    const { content, videoUrl, industry, analysis } = data;

    // 创建文案记录
    const copywriting = await this.prisma.copywriting.create({
      data: {
        userId,
        title: content.substring(0, 50),
        content,
        videoUrl: videoUrl || undefined,
        industry: industry || 'other',
        sourceType: 'original',
      },
    });

    // 保存拆解分析
    const analysisRecord = await this.prisma.copywritingAnalysis.create({
      data: {
        copywritingId: copywriting.id,
        originalText: content,
        topic: analysis.topic || '',
        hook: analysis.hook || '',
        goldenSentence: analysis.goldenSentence || '',
        adPlacement: typeof analysis.adPlacement === 'object'
          ? JSON.stringify(analysis.adPlacement)
          : (analysis.adPlacement || ''),
        analysisContent: analysis.content || '',
        tags: analysis.tags || [],
        industry: industry || 'other',
        aiConfidence: analysis.confidence || {},
        isModified: false,
      },
    });

    return {
      copywriting,
      analysis: analysisRecord,
    };
  }

  // 分析文案
  async analyze(analyzeDto: AnalyzeDto, headers?: any) {
    const { content } = analyzeDto;

    const aiOpts = {
      apiKey: headers?.['x-ai-key'] || headers?.['X-AI-Key'],
      baseUrl: headers?.['x-ai-base-url'] || headers?.['X-AI-Base-Url'],
      model: headers?.['x-ai-model'] || headers?.['X-AI-Model'],
    };

    // 调用AI进行分析
    const result = await this.aiService.analyzeCopywriting(content, aiOpts);

    return result;
  }

  // 优化文案
  async optimize(optimizeDto: any, headers?: any) {
    const { content } = optimizeDto;

    const aiOpts = {
      apiKey: headers?.['x-ai-key'] || headers?.['X-AI-Key'],
      baseUrl: headers?.['x-ai-base-url'] || headers?.['X-AI-Base-Url'],
      model: headers?.['x-ai-model'] || headers?.['X-AI-Model'],
    };

    // 调用AI进行优化
    const result = await this.aiService.optimizeCopywriting(content, aiOpts);

    return result;
  }

  // 创建原创文案（只保存，不做AI分析）
  async create(userId: string, createDto: CreateCopywritingDto, headers?: any) {
    const { title, content, reference, industry, sourceType, isPublic, isSystemMaterial } = createDto;

    // 保存文案
    const copywriting = await this.prisma.copywriting.create({
      data: {
        userId,
        title: title || content.substring(0, 50),
        content,
        industry: industry || 'other',
        sourceType: sourceType || 'original',
        status: 'draft',
        isPublic: isPublic || false,
        isSystemMaterial: isSystemMaterial || false,
      },
    });

    return {
      copywriting,
      message: '文案已保存',
    };
  }

  // 文案仿写（只生成，不保存）
  async rewrite(userId: string, rewriteDto: RewriteDto, headers?: any) {
    const {
      referenceId,
      referenceContent,
      newContent,
      rewriteType,
    } = rewriteDto;

    const aiOpts = {
      apiKey: headers?.['x-ai-key'] || headers?.['X-AI-Key'],
      baseUrl: headers?.['x-ai-base-url'] || headers?.['X-AI-Base-Url'],
      model: headers?.['x-ai-model'] || headers?.['X-AI-Model'],
    };

    // 调用AI生成仿写，只返回结果，不保存
    const rewriteResult = await this.aiService.rewriteCopywriting({
      reference: referenceContent || '',
      newContent,
      type: rewriteType,
    }, aiOpts);

    return {
      ...rewriteResult,
      referenceId,
      referenceContent,
    };
  }

  // 保存仿写结果到数据库
  async saveRewrite(userId: string, data: any) {
    const { title, content, referenceId, referenceContent, rewriteType } = data;

    // 创建文案记录
    const copywriting = await this.prisma.copywriting.create({
      data: {
        userId,
        title: title || content.substring(0, 50),
        content,
        industry: 'other',
        sourceType: 'rewrite',
        sourceId: referenceId,
      },
    });

    // 如果有原文案ID，创建关联关系
    if (referenceId) {
      await this.prisma.copywritingRelation.create({
        data: {
          parentId: referenceId,
          childId: copywriting.id,
          relationType: 'rewrite',
          rewriteStrategy: rewriteType,
          isExternalRef: false,
        },
      });
    } else if (referenceContent) {
      // 外部参考文案
      await this.prisma.copywritingRelation.create({
        data: {
          parentId: copywriting.id, // 临时使用自己的ID
          childId: copywriting.id,
          relationType: 'rewrite',
          rewriteStrategy: rewriteType,
          isExternalRef: true,
          externalRefText: referenceContent,
        },
      });
    }

    return {
      copywriting,
      message: '仿写文案已保存',
    };
  }

  // 获取文案列表
  async findAll(userId: string, filters?: any) {
    return this.prisma.copywriting.findMany({
      where: {
        OR: [
          // 1. 用户自己的所有文案
          { userId },
          // 2. 系统素材（所有人可见）
          { isSystemMaterial: true },
          // 3. 其他用户已审核通过的共享文案（必须同时满足两个条件）
          { 
            AND: [
              { isPublic: true },
              { shareStatus: 'approved' },
              { userId: { not: userId } } // 确保不是当前用户的
            ]
          },
        ],
        ...filters,
      },
      include: {
        analysis: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // 获取文案详情
  async findOne(id: string) {
    return this.prisma.copywriting.findUnique({
      where: { id },
      include: {
        analysis: true,
        relations: {
          include: {
            parent: true,
          },
        },
        children: {
          include: {
            child: true,
          },
        },
      },
    });
  }

  // 更新文案
  async update(id: string, userId: string, updateDto: any) {
    // 确保只能更新自己的文案或管理员可以更新
    const copywriting = await this.prisma.copywriting.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!copywriting) {
      throw new Error('文案不存在');
    }

    // 检查权限：自己的文案或管理员
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (copywriting.userId !== userId && user?.role !== 'admin') {
      throw new Error('无权修改此文案');
    }

    return this.prisma.copywriting.update({
      where: { id },
      data: {
        title: updateDto.title,
        content: updateDto.content,
        industry: updateDto.industry,
      },
    });
  }

  // 删除文案
  async remove(id: string, userId: string) {
    // 获取用户信息检查权限
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const copywriting = await this.prisma.copywriting.findUnique({
      where: { id },
    });

    if (!copywriting) {
      throw new Error('文案不存在');
    }

    // 检查权限：自己的文案或管理员
    if (copywriting.userId !== userId && user?.role !== 'admin') {
      throw new Error('无权删除此文案');
    }

    return this.prisma.copywriting.delete({
      where: { id },
    });
  }

  // 分享文案到素材库（提交审核）
  async shareToLibrary(id: string, userId: string, action: string) {
    const copywriting = await this.prisma.copywriting.findFirst({
      where: { id, userId },
    });

    if (!copywriting) {
      throw new Error('文案不存在或无权操作');
    }

    if (copywriting.isSystemMaterial) {
      throw new Error('系统素材无需分享');
    }

    if (copywriting.shareStatus === 'pending') {
      throw new Error('已提交审核，请等待管理员处理');
    }

    if (copywriting.isPublic) {
      throw new Error('该文案已经是公开素材');
    }

    // 更新为待审核状态
    return this.prisma.copywriting.update({
      where: { id },
      data: {
        shareStatus: 'pending',
      },
    });
  }

  // 获取所有待审核的分享申请（管理员）
  async getShareRequests(user: any) {
    if (user.role !== 'admin') {
      throw new Error('权限不足');
    }

    return this.prisma.copywriting.findMany({
      where: {
        shareStatus: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        analysis: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // 获取所有素材（管理员）
  async getAllMaterials(user: any) {
    if (user.role !== 'admin') {
      throw new Error('权限不足');
    }

    return this.prisma.copywriting.findMany({
      where: {
        shareStatus: {
          in: ['pending', 'approved', 'rejected'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        analysis: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // 审核分享申请（管理员）
  async reviewShareRequest(id: string, user: any, action: 'approve' | 'reject') {
    if (user.role !== 'admin') {
      throw new Error('权限不足');
    }

    const copywriting = await this.prisma.copywriting.findUnique({
      where: { id },
    });

    if (!copywriting) {
      throw new Error('文案不存在');
    }

    if (copywriting.shareStatus !== 'pending') {
      throw new Error('该文案不在待审核状态');
    }

    if (action === 'approve') {
      return this.prisma.copywriting.update({
        where: { id },
        data: {
          shareStatus: 'approved',
          isPublic: true,
        },
      });
    } else {
      return this.prisma.copywriting.update({
        where: { id },
        data: {
          shareStatus: 'rejected',
        },
      });
    }
  }
}




