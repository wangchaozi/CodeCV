import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../user/entities/user.entity';
import { ResumeEntity } from '../../resume/entities/resume.entity';
import { InterviewAnswerEntity } from './interview-answer.entity';

export type SessionStatus = 'in_progress' | 'completed';

@Entity('interview_sessions')
@Index(['userId'])
@Index(['resumeId'])
export class InterviewSessionEntity {
  @ApiProperty({ description: '会话 ID（UUID）' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: ResumeEntity;

  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId: string;

  @ApiProperty({ description: '会话状态', enum: ['in_progress', 'completed'] })
  @Column({ type: 'varchar', length: 20, default: 'in_progress', comment: '会话状态' })
  status: SessionStatus;

  @ApiProperty({ description: '总题目数' })
  @Column({ type: 'smallint', default: 0, comment: '总题目数' })
  totalQuestions: number;

  @ApiProperty({ description: '选择题答对数', nullable: true })
  @Column({ type: 'smallint', nullable: true, comment: '选择题答对数' })
  correctCount: number | null;

  @ApiProperty({ description: '综合得分（0-100）', nullable: true })
  @Column({ type: 'smallint', nullable: true, comment: '综合得分' })
  score: number | null;

  @ApiProperty({ description: '开始时间' })
  @CreateDateColumn({ type: 'timestamp', comment: '面试开始时间' })
  startTime: Date;

  @ApiProperty({ description: '结束时间', nullable: true })
  @Column({ type: 'timestamp', nullable: true, comment: '面试结束时间' })
  endTime: Date | null;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updateTime: Date;

  @OneToMany(() => InterviewAnswerEntity, (a) => a.session)
  answers: InterviewAnswerEntity[];
}
