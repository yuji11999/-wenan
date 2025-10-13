import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SavePromptsDto {
  @ApiProperty({ description: '系统提示词', required: false })
  @IsOptional()
  @IsString()
  system?: string;

  @ApiProperty({ description: '文案拆解提示词', required: false })
  @IsOptional()
  @IsString()
  deconstruct?: string;

  @ApiProperty({ description: '爆款分析提示词', required: false })
  @IsOptional()
  @IsString()
  analyze?: string;

  @ApiProperty({ description: '结构仿写提示词', required: false })
  @IsOptional()
  @IsString()
  rewriteStructure?: string;

  @ApiProperty({ description: '风格仿写提示词', required: false })
  @IsOptional()
  @IsString()
  rewriteStyle?: string;

  @ApiProperty({ description: '钩子仿写提示词', required: false })
  @IsOptional()
  @IsString()
  rewriteHook?: string;

  @ApiProperty({ description: '混合仿写提示词', required: false })
  @IsOptional()
  @IsString()
  rewriteMixed?: string;

  @ApiProperty({ description: '文案优化提示词', required: false })
  @IsOptional()
  @IsString()
  optimize?: string;
}







