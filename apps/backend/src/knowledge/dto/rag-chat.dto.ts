import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryItemDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class RagChatDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
