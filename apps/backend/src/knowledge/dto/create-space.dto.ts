import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  coverColor?: string;
}
