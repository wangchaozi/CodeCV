import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeSpaceEntity } from './knowledge-space.entity';

export type ArticleSource = 'manual' | 'upload';
export type UploadStatus = 'uploading' | 'parsing' | 'parsed' | 'failed';

@Entity('knowledge_articles')
export class KnowledgeArticleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'float', default: 0 })
  sortOrder: number;

  @Column({ length: 20, default: 'manual' })
  source: ArticleSource;

  @Column({ nullable: true })
  originalFileName: string;

  @Column({ length: 20, nullable: true })
  fileFormat: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ length: 20, nullable: true })
  uploadStatus: UploadStatus;

  @ManyToOne(() => KnowledgeSpaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spaceId' })
  space: KnowledgeSpaceEntity;

  @Column()
  spaceId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
