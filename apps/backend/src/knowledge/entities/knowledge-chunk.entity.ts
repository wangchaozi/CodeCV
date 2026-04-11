import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeArticleEntity } from './knowledge-article.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  /** Gemini text-embedding-004 向量，768 维，存储为 jsonb */
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[] | null;

  @Column()
  chunkIndex: number;

  /** 冗余 spaceId 方便按空间检索所有 chunk */
  @Column()
  spaceId: number;

  @ManyToOne(() => KnowledgeArticleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: KnowledgeArticleEntity;

  @Column()
  articleId: number;
}
