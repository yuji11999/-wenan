import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAIConfigDto {
  @ApiProperty({ description: 'AI服务商', required: false })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty({ description: '服务商显示名称', required: false })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiProperty({ description: '模型名称', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ description: '模型显示名称', required: false })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiProperty({ description: 'API Key', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ description: 'API地址', required: false })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiProperty({ description: '是否设为当前激活配置', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
