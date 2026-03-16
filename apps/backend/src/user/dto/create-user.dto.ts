// apps/backend/src/modules/user/dto/create-user.dto.ts
import { z } from 'zod';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

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
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsEmail({}, { message: '邮箱格式错误' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @MinLength(6, { message: '密码至少6个字符' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  phone?: string;
  organization?: string;
}
