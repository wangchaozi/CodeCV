import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { ResumeStatus } from '../entities/resume.entity';

export class ResumeListQueryDto {
  @ApiPropertyOptional({ description: '筛选状态', enum: ['pending', 'parsing', 'done', 'error'] })
  @IsOptional()
  @IsIn(['pending', 'parsing', 'done', 'error'])
  status?: ResumeStatus;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '偏移量', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
