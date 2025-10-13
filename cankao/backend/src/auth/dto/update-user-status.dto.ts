import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ 
    example: 'approved', 
    description: '用户状态',
    enum: ['pending', 'approved', 'rejected', 'disabled']
  })
  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'disabled'])
  status: string;
}

