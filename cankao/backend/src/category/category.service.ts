import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private prisma: PrismaService) {}

  // 获取所有分类
  async findAll() {
    try {
      return await this.prisma.category.findMany({
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    } catch (error) {
      // 数据库不可用时，返回空数组避免前端 500
      this.logger.error('查询分类列表失败，返回空数组以保证可用性');
      return [];
    }
  }

  // 创建分类
  async create(data: { name: string; value: string; sortOrder?: number }) {
    // 检查名称是否已存在
    const existingByName = await this.prisma.category.findUnique({
      where: { name: data.name },
    });
    if (existingByName) {
      throw new ConflictException('分类名称已存在');
    }

    // 检查值是否已存在
    const existingByValue = await this.prisma.category.findUnique({
      where: { value: data.value },
    });
    if (existingByValue) {
      throw new ConflictException('分类值已存在');
    }

    return this.prisma.category.create({
      data: {
        name: data.name,
        value: data.value,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  // 更新分类
  async update(id: string, data: { name?: string; value?: string; sortOrder?: number }) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    // 如果更新名称，检查是否与其他分类重复
    if (data.name && data.name !== category.name) {
      const existingByName = await this.prisma.category.findUnique({
        where: { name: data.name },
      });
      if (existingByName) {
        throw new ConflictException('分类名称已存在');
      }
    }

    // 如果更新值，检查是否与其他分类重复
    if (data.value && data.value !== category.value) {
      const existingByValue = await this.prisma.category.findUnique({
        where: { value: data.value },
      });
      if (existingByValue) {
        throw new ConflictException('分类值已存在');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // 删除分类
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    // 检查是否为默认分类
    if (category.isDefault) {
      throw new ConflictException('默认分类不能删除');
    }

    // 检查是否有文案使用此分类
    const copywritingCount = await this.prisma.copywriting.count({
      where: { industry: category.value },
    });

    if (copywritingCount > 0) {
      throw new ConflictException(`该分类下有 ${copywritingCount} 篇文案，无法删除`);
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  // 初始化默认分类
  async initDefaultCategories() {
    const count = await this.prisma.category.count();
    if (count > 0) {
      return; // 已有分类，不需要初始化
    }

    const defaultCategories = [
      { name: '科技互联网', value: 'tech', sortOrder: 1 },
      { name: '教育培训', value: 'education', sortOrder: 2 },
      { name: '生活方式', value: 'lifestyle', sortOrder: 3 },
      { name: '美食餐饮', value: 'food', sortOrder: 4 },
      { name: '时尚美妆', value: 'fashion', sortOrder: 5 },
      { name: '健康养生', value: 'health', sortOrder: 6 },
      { name: '金融理财', value: 'finance', sortOrder: 7 },
      { name: '娱乐影视', value: 'entertainment', sortOrder: 8 },
      { name: '其他', value: 'other', sortOrder: 999, isDefault: true },
    ];

    await this.prisma.category.createMany({
      data: defaultCategories,
    });
  }
}

