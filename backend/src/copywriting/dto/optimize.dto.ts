import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OptimizeDto {
  @ApiProperty({ description: '需要优化的文案内容' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

