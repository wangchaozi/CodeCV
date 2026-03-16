// apps/backend/src/modules/user/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: '邮箱格式错误' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @MinLength(6, { message: '密码至少6个字符' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
