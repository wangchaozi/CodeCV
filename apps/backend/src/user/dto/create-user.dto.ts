// apps/backend/src/modules/user/dto/create-user.dto.ts
import { z } from 'zod';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Zod Schema（共享包可复用）
export const CreateUserSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符'),
  email: z.string().email('邮箱格式错误'),
  password: z.string().min(6, '密码至少6个字符'),
  phone: z.string().optional(),
  organization: z.string().optional(),
});

// Class Validator（NestJS 参数校验）
export class CreateUserDto {
  @ApiProperty({ example: 'codecv' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({ example: 'demo@example.com' })
  @IsEmail({}, { message: '邮箱格式错误' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @MinLength(6, { message: '密码至少6个字符' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiProperty({ required: false, example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'CodeCV Inc.' })
  @IsOptional()
  @IsString()
  organization?: string;
}
