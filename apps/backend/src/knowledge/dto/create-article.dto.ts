import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength, IsNumber } from 'class-validator';

export class CreateArticleDto {
  @IsNumber()
  spaceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
