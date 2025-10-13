import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeDto {
  @ApiProperty({ description: '要分析的文案内容' })
  @IsString()
  content: string;
}





