import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeSpaceEntity } from './entities/knowledge-space.entity';
import { KnowledgeArticleEntity } from './entities/knowledge-article.entity';
import { KnowledgeChunkEntity } from './entities/knowledge-chunk.entity';
import { KnowledgeService } from './knowledge.service';
import { RagService } from './rag.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeSpaceEntity,
      KnowledgeArticleEntity,
      KnowledgeChunkEntity,
    ]),
  ],
  providers: [KnowledgeService, RagService],
  controllers: [KnowledgeController],
})
export class KnowledgeModule {}
