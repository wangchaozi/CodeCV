import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456', minLength: 6, description: '旧密码' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @MinLength(6, { message: '旧密码至少6位' })
  oldPassword: string;

  @ApiProperty({ example: '654321', minLength: 6, description: '新密码' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '新密码至少6位' })
  newPassword: string;
}
