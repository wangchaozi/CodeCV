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
import { InterviewSessionEntity } from './interview-session.entity';
import { InterviewQuestionEntity } from './interview-question.entity';

@Entity('interview_answers')
@Index(['sessionId'])
export class InterviewAnswerEntity {
  @ApiProperty({ description: '答案记录 ID（UUID）' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InterviewSessionEntity, (s) => s.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: InterviewSessionEntity;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => InterviewQuestionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: InterviewQuestionEntity;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ApiProperty({ description: '用户作答内容' })
  @Column({ type: 'text', comment: '用户提交的答案' })
  userAnswer: string;

  @ApiProperty({ description: '是否正确（选择题）', nullable: true })
  @Column({ type: 'boolean', nullable: true, comment: '选择题是否答对' })
  isCorrect: boolean | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamp', comment: '提交时间' })
  createTime: Date;
}
