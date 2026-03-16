import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleActiveDto {
  @ApiProperty({ example: true, description: '是否启用用户' })
  @IsBoolean({ message: 'isActive 必须是布尔值' })
  isActive: boolean;
}
