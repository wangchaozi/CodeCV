// apps/backend/src/modules/user/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  username?: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  organization?: string;
}
