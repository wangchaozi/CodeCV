import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
