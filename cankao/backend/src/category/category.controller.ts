import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('分类管理')
@Controller('category')
export class CategoryController {
  private readonly logger = new Logger(CategoryController.name);

  constructor(private readonly categoryService: CategoryService) {}

  // 获取所有分类（公开接口，不需要认证）
  @Get()
  async findAll() {
    try {
      return await this.categoryService.findAll();
    } catch (error) {
      this.logger.error('获取分类列表失败');
      // 返回空数组以避免前端崩溃
      return [];
    }
  }

  // 创建分类（需要认证）
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createDto: { name: string; value: string; sortOrder?: number }) {
    return this.categoryService.create(createDto);
  }

  // 更新分类（需要认证）
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() updateDto: { name?: string; value?: string; sortOrder?: number },
  ) {
    return this.categoryService.update(id, updateDto);
  }

  // 删除分类（需要认证）
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // 初始化默认分类（需要认证，通过环境变量控制是否允许）
  @Post('init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  initDefaults() {
    if (process.env.ALLOW_INIT_DEFAULT_CATEGORIES !== 'true') {
      throw new HttpException('已禁用默认分类初始化', HttpStatus.FORBIDDEN);
    }
    return this.categoryService.initDefaultCategories();
  }
}

