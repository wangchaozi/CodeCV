import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InterviewQuestionEntity } from './entities/interview-question.entity';
import { InterviewSessionEntity } from './entities/interview-session.entity';
import { InterviewAnswerEntity } from './entities/interview-answer.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { GeminiService } from '../resume/gemini.service';
import type { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  /** 防止同一简历并发触发多次 Gemini 生成的内存锁 */
  private readonly generatingLocks = new Set<string>();

  constructor(
    @InjectRepository(InterviewQuestionEntity)
    private readonly questionRepo: Repository<InterviewQuestionEntity>,
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    @InjectRepository(InterviewAnswerEntity)
    private readonly answerRepo: Repository<InterviewAnswerEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * 获取或生成指定简历的题目（如已存在直接返回，否则调用 Gemini 生成）
   */
  async getOrGenerateQuestions(resumeId: string, userId: string): Promise<InterviewQuestionEntity[]> {
    const resume = await this.checkResumeAccess(resumeId, userId);

    const existing = await this.questionRepo.find({
      where: { resumeId },
      order: { sortOrder: 'ASC', createTime: 'ASC' },
    });
    if (existing.length > 0) return existing;

    return this.generateAndSave(resume);
  }

  /**
   * 强制重新生成题目（删除旧题目后重新调用 Gemini）
   */
  async regenerateQuestions(resumeId: string, userId: string): Promise<InterviewQuestionEntity[]> {
    const resume = await this.checkResumeAccess(resumeId, userId);
    await this.questionRepo.delete({ resumeId });
    return this.generateAndSave(resume);
  }

  /**
   * 开始一次新面试会话（返回会话 + 题目列表）
   */
  async startSession(resumeId: string, userId: string): Promise<{
    session: InterviewSessionEntity;
    questions: InterviewQuestionEntity[];
  }> {
    const questions = await this.getOrGenerateQuestions(resumeId, userId);

    const session = this.sessionRepo.create({
      userId,
      resumeId,
      status: 'in_progress',
      totalQuestions: questions.length,
    });
    const saved = await this.sessionRepo.save(session);

    return { session: saved, questions };
  }

  /**
   * 提交答卷并计算得分
   */
  async submitSession(
    sessionId: string,
    userId: string,
    dto: SubmitAnswersDto,
  ): Promise<InterviewSessionEntity> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('面试会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权操作此会话');
    if (session.status === 'completed') throw new BadRequestException('会话已完成，不可重复提交');

    const questions = await this.questionRepo.find({ where: { resumeId: session.resumeId } });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    let mcTotal = 0;

    // 删除旧答案（恢复会话后重新提交时避免重复记录）
    await this.answerRepo.delete({ sessionId });

    const answerEntities = dto.answers.map((item) => {
      const q = questionMap.get(item.questionId);
      let isCorrect: boolean | null = null;
      if (q?.type === 'multiple_choice' && q.correctAnswer) {
        mcTotal++;
        isCorrect = item.userAnswer.trim().toUpperCase() === q.correctAnswer.toUpperCase();
        if (isCorrect) correctCount++;
      }
      return this.answerRepo.create({
        sessionId,
        questionId: item.questionId,
        userAnswer: item.userAnswer,
        isCorrect,
      });
    });

    await this.answerRepo.save(answerEntities);

    const score = mcTotal > 0 ? Math.round((correctCount / mcTotal) * 100) : null;

    await this.sessionRepo.update(sessionId, {
      status: 'completed',
      correctCount: mcTotal > 0 ? correctCount : null,
      score,
      endTime: new Date(),
    });

    const updated = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['answers'],
    });
    return updated!;
  }

  /**
   * 获取当前用户的面试记录列表（分页）
   */
  async getSessions(userId: string, limit = 20, offset = 0): Promise<{
    items: InterviewSessionEntity[];
    total: number;
  }> {
    const [items, total] = await this.sessionRepo.findAndCount({
      where: { userId },
      order: { startTime: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['resume'],
    });
    return { items, total };
  }

  /**
   * 删除单条面试记录（级联删除答案）
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('面试会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权删除此会话');
    await this.sessionRepo.delete(sessionId);
  }

  /**
   * 批量删除面试记录
   */
  async deleteSessions(sessionIds: string[], userId: string): Promise<void> {
    if (sessionIds.length === 0) return;
    const sessions = await this.sessionRepo.find({
      where: { id: In(sessionIds), userId },
    });
    if (sessions.length === 0) return;
    await this.sessionRepo.delete(sessions.map((s) => s.id));
  }

  /**
   * 获取面试会话详情（含题目和答案）
   */
  async getSessionDetail(sessionId: string, userId: string): Promise<{
    session: InterviewSessionEntity;
    questions: InterviewQuestionEntity[];
    answers: InterviewAnswerEntity[];
  }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['resume'],
    });
    if (!session) throw new NotFoundException('面试会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权访问此会话');

    const questions = await this.questionRepo.find({
      where: { resumeId: session.resumeId },
      order: { sortOrder: 'ASC', createTime: 'ASC' },
    });
    const answers = await this.answerRepo.find({ where: { sessionId } });

    return { session, questions, answers };
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────────

  private async checkResumeAccess(resumeId: string, userId: string): Promise<ResumeEntity> {
    const resume = await this.resumeRepo.findOne({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('简历不存在');
    if (resume.userId !== userId) throw new ForbiddenException('无权访问此简历');
    if (resume.status !== 'done') throw new BadRequestException('简历尚未解析完成，请等待解析完成后再生成题目');
    if (!resume.parsedContent || !resume.interviewFocus) {
      throw new BadRequestException('简历解析内容不完整，无法生成题目');
    }
    return resume;
  }

  private async generateAndSave(resume: ResumeEntity): Promise<InterviewQuestionEntity[]> {
    const resumeId = resume.id;

    // 若已有其他并发请求正在生成，等待其完成后直接返回已存题目
    if (this.generatingLocks.has(resumeId)) {
      this.logger.warn(`Generation already in progress for resume: ${resumeId}, waiting...`);
      await this.waitForLockRelease(resumeId);
      return this.questionRepo.find({
        where: { resumeId },
        order: { sortOrder: 'ASC', createTime: 'ASC' },
      });
    }

    this.generatingLocks.add(resumeId);
    this.logger.log(`Generating questions for resume: ${resumeId}`);

    try {
      // 加锁后再次检查，防止在等待锁期间已有结果写入
      const existing = await this.questionRepo.find({ where: { resumeId } });
      if (existing.length > 0) {
        return existing;
      }

      const result = await this.gemini.generateQuestions(resume.parsedContent!, resume.interviewFocus!);

      const entities = result.questions.map((q, idx) =>
        this.questionRepo.create({
          resumeId,
          type: q.type,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: q.category,
          difficulty: q.difficulty,
          sortOrder: idx,
        }),
      );

      const saved = await this.questionRepo.save(entities);
      this.logger.log(`Generated ${saved.length} questions for resume: ${resumeId}`);
      return saved;
    } finally {
      this.generatingLocks.delete(resumeId);
    }
  }

  /** 轮询等待锁释放（最多 60s） */
  private waitForLockRelease(resumeId: string, maxWaitMs = 60_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (!this.generatingLocks.has(resumeId)) return resolve();
        if (Date.now() - start > maxWaitMs) return reject(new Error('等待题目生成超时，请重试'));
        setTimeout(check, 500);
      };
      check();
    });
  }
}
