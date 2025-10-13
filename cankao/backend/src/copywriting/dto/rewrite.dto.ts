import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RewriteType {
  STRUCTURE = 'structure',
  STYLE = 'style',
  HOOK = 'hook',
  MIXED = 'mixed',
}

export class RewriteDto {
  @ApiPropertyOptional({ description: '参考文案ID（从素材库选择）' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ description: '参考文案内容（直接输入）' })
  @IsOptional()
  @IsString()
  referenceContent?: string;

  @ApiProperty({ description: '新的核心内容/卖点' })
  @IsString()
  newContent: string;

  @ApiProperty({ enum: RewriteType, description: '仿写类型' })
  @IsEnum(RewriteType)
  rewriteType: RewriteType;
}





