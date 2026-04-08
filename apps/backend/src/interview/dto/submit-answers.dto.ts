import { IsString, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerItemDto {
  @ApiProperty({ description: '题目 ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: '用户作答内容' })
  @IsString()
  userAnswer: string;
}

export class SubmitAnswersDto {
  @ApiProperty({ description: '答案列表', type: [AnswerItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];

  @ApiProperty({ description: '前端计时的实际答题秒数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSecs?: number;
}
