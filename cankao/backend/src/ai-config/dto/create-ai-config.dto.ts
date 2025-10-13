import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAIConfigDto {
  @ApiProperty({ description: 'AI服务商', example: 'openai' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: '服务商显示名称', example: 'OpenAI' })
  @IsString()
  @IsNotEmpty()
  providerName: string;

  @ApiProperty({ description: '模型名称', example: 'gpt-4' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: '模型显示名称', example: 'GPT-4' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({ description: 'API Key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ description: 'API地址', example: 'https://api.openai.com/v1' })
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @ApiProperty({ description: '是否设为当前激活配置', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
