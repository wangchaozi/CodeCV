import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewQuestionEntity } from './entities/interview-question.entity';
import { InterviewSessionEntity } from './entities/interview-session.entity';
import { InterviewAnswerEntity } from './entities/interview-answer.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { GeminiService } from '../resume/gemini.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewQuestionEntity,
      InterviewSessionEntity,
      InterviewAnswerEntity,
      ResumeEntity,
    ]),
  ],
  providers: [InterviewService, GeminiService],
  controllers: [InterviewController],
})
export class InterviewModule {}
