import { IsString, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
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
}
