import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserEntity } from '../../user/entities/user.entity';

export type ResumeStatus = 'pending' | 'parsing' | 'done' | 'error';

export interface DimensionScore {
  label: string;
  score: number;
  color: string;
}

export interface FocusTopic {
  label: string;
  weight: 'high' | 'medium' | 'low';
  desc: string;
}

export interface InterviewFocus {
  id: string;
  title: string;
  color: string;
  topics: FocusTopic[];
}

export interface ParsedResumeContent {
  candidate: {
    name: string;
    phone: string;
    email: string;
    location: string;
    experience: string;
  };
  summary: string;
  experience: {
    id: number;
    company: string;
    role: string;
    period: string;
    bullets: string[];
  }[];
  skills: { category: string; items: string[] }[];
  projects: {
    id: number;
    name: string;
    period: string;
    bullets: string[];
  }[];
  education: { school: string; degree: string; period: string }[];
}

@Entity('resumes')
@Index(['userId'])
export class ResumeEntity {
  @ApiProperty({ description: '简历 ID（UUID）' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ description: '原始文件名' })
  @Column({ type: 'varchar', length: 255, comment: '用户上传时的原始文件名' })
  originalName: string;

  @ApiProperty({ description: '文件大小（字节）' })
  @Column({ type: 'int', comment: '文件字节大小' })
  fileSize: number;

  @ApiProperty({ description: 'MIME 类型' })
  @Column({ type: 'varchar', length: 100, comment: 'MIME 类型' })
  mimeType: string;

  /**
   * 文件二进制内容（PostgreSQL bytea）
   * - select: false：普通查询不自动加载，避免每次传输大量字节
   * - nullable: true：兼容旧数据和 synchronize 时的 ALTER TABLE
   */
  @Exclude()
  @Column({ type: 'bytea', nullable: true, comment: '简历文件二进制内容', select: false })
  fileContent: Buffer | null;

  @ApiProperty({ description: '解析状态', enum: ['pending', 'parsing', 'done', 'error'] })
  @Column({
    type: 'varchar',
    length: 20,
    default: 'parsing',
    comment: '解析状态: pending | parsing | done | error',
  })
  status: ResumeStatus;

  @ApiProperty({ description: 'AI 综合评分（0-100）', nullable: true })
  @Column({ type: 'smallint', nullable: true, comment: 'AI 综合评分 0-100' })
  score: number | null;

  @ApiProperty({ description: '各维度评分', nullable: true })
  @Column({ type: 'jsonb', nullable: true, comment: '维度评分 JSON' })
  dimensionScores: DimensionScore[] | null;

  @ApiProperty({ description: '结构化简历解析内容', nullable: true })
  @Column({ type: 'jsonb', nullable: true, comment: '解析后的结构化简历 JSON' })
  parsedContent: ParsedResumeContent | null;

  @ApiProperty({ description: 'AI 面试侧重点', nullable: true })
  @Column({ type: 'jsonb', nullable: true, comment: 'AI 面试侧重点 JSON' })
  interviewFocus: InterviewFocus[] | null;

  @ApiProperty({ description: '解析错误信息', nullable: true })
  @Column({ type: 'text', nullable: true, comment: '解析失败时的错误信息' })
  errorMessage: string | null;

  @ApiProperty({ description: '上传时间' })
  @CreateDateColumn({ type: 'timestamp', comment: '上传时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updateTime: Date;
}
