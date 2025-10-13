import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: '用户名' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  username: string;

  @ApiProperty({ example: 'password123', description: '密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}





