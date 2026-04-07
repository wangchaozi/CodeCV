import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ResumeEntity } from '../../resume/entities/resume.entity';

export type QuestionType = 'multiple_choice' | 'open_ended';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

@Entity('interview_questions')
@Index(['resumeId'])
export class InterviewQuestionEntity {
  @ApiProperty({ description: '题目 ID（UUID）' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: ResumeEntity;

  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId: string;

  @ApiProperty({ description: '题目类型', enum: ['multiple_choice', 'open_ended'] })
  @Column({ type: 'varchar', length: 30, comment: '题目类型: multiple_choice | open_ended' })
  type: QuestionType;

  @ApiProperty({ description: '题目内容' })
  @Column({ type: 'text', comment: '题目内容' })
  content: string;

  @ApiProperty({ description: '选项（选择题）', nullable: true })
  @Column({ type: 'jsonb', nullable: true, comment: '选择题选项列表' })
  options: string[] | null;

  @ApiProperty({ description: '正确答案（选择题）', nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true, comment: '正确答案，选择题填 A/B/C/D' })
  correctAnswer: string | null;

  @ApiProperty({ description: '解析说明', nullable: true })
  @Column({ type: 'text', nullable: true, comment: '答案解析或参考要点' })
  explanation: string | null;

  @ApiProperty({ description: '考察维度分类' })
  @Column({ type: 'varchar', length: 50, comment: '考察分类（对应面试侧重点维度）' })
  category: string;

  @ApiProperty({ description: '难度', enum: ['easy', 'medium', 'hard'] })
  @Column({ type: 'varchar', length: 10, comment: '难度: easy | medium | hard' })
  difficulty: QuestionDifficulty;

  @ApiProperty({ description: '排序序号' })
  @Column({ type: 'smallint', default: 0, comment: '题目排序' })
  sortOrder: number;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamp', comment: '题目生成时间' })
  createTime: Date;
}
