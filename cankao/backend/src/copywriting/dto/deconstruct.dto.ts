import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeconstructDto {
  @ApiProperty({ description: '文案内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '视频链接（可选）' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: '行业（用户选择）' })
  @IsOptional()
  @IsString()
  industry?: string;
}




