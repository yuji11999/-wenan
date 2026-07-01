import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiConfigService } from './ai-config.service';
import { CreateAIConfigDto } from './dto/create-ai-config.dto';
import { UpdateAIConfigDto } from './dto/update-ai-config.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('AI配置')
@Controller('ai-config')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@ApiBearerAuth()
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Post()
  @ApiOperation({ summary: '创建AI配置' })
  create(@Request() req, @Body() createDto: CreateAIConfigDto) {
    return this.aiConfigService.create(req.user.id, createDto);
  }

  @Post('models')
  @ApiOperation({ summary: '通过后端获取AI模型列表' })
  fetchModels(@Body() body: any) {
    return this.aiConfigService.fetchModels(body);
  }

  @Post('test')
  @ApiOperation({ summary: '通过后端测试AI配置连接' })
  testConnection(@Body() body: any) {
    return this.aiConfigService.testConnection(body);
  }

  @Get()
  @ApiOperation({ summary: '获取所有AI配置' })
  findAll(@Request() req) {
    return this.aiConfigService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: '获取当前激活的配置' })
  findActive(@Request() req) {
    return this.aiConfigService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个AI配置' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.aiConfigService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新AI配置' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateAIConfigDto,
  ) {
    return this.aiConfigService.update(id, updateDto);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: '设置为激活配置' })
  setActive(@Request() req, @Param('id') id: string) {
    return this.aiConfigService.setActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除AI配置' })
  remove(@Request() req, @Param('id') id: string) {
    return this.aiConfigService.remove(id);
  }
}
