import { Body, Controller, Get, Put, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SavePromptsDto } from './dto/save-prompts.dto';

@ApiTags('系统设置')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get('prompts')
  @ApiOperation({ summary: '获取提示词配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPrompts() {
    try {
      return await this.settingsService.getPrompts();
    } catch (error) {
      this.logger.error('获取提示词配置失败');
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '获取提示词配置失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('prompts')
  @ApiOperation({ summary: '保存提示词配置' })
  @ApiResponse({ status: 200, description: '保存成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async savePrompts(@Body() body: SavePromptsDto) {
    try {
      await this.settingsService.savePrompts(body);
      return { success: true, message: '提示词保存成功' };
    } catch (error) {
      this.logger.error('保存提示词配置失败');
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '保存提示词配置失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user-stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '获取用户数据统计（仅管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async getUserStats() {
    try {
      return await this.settingsService.getUserDataStats();
    } catch (error) {
      this.logger.error('获取用户数据统计失败', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '获取用户数据统计失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}



