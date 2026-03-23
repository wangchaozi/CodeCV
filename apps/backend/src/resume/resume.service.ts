import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from './entities/resume.entity';
import type { ResumeListQueryDto } from './dto/resume-list-query.dto';
import { GeminiService } from './gemini.service';

// ─── 允许的 MIME 类型 ──────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectRepository(ResumeEntity)
    private readonly repo: Repository<ResumeEntity>,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * 上传简历文件并触发 AI 解析（memoryStorage，文件内容存入数据库）
   */
  async upload(userId: string, file: Express.Multer.File): Promise<ResumeEntity> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('仅支持 PDF / DOCX 格式的简历文件');
    }

    const resume = this.repo.create({
      userId,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileContent: file.buffer,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'parsing',
    });

    const saved = await this.repo.save(resume);
    this.logger.log(`Resume uploaded: ${saved.id} by user ${userId}`);

    void this.parseResume(saved.id);

    return saved;
  }

  /**
   * 查询当前用户的简历列表（分页）
   */
  async findAll(
    userId: string,
    query: ResumeListQueryDto,
  ): Promise<{ items: ResumeEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .orderBy('r.createTime', 'DESC')
      .take(query.limit ?? 20)
      .skip(query.offset ?? 0);

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * 获取单份简历详情（校验归属权）
   */
  async findOne(id: string, userId: string): Promise<ResumeEntity> {
    const resume = await this.repo.findOne({ where: { id } });
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
    if (resume.userId !== userId) {
      throw new ForbiddenException('无权访问此简历');
    }
    return resume;
  }

  /**
   * 删除简历记录（文件存在 DB，随行删除）
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.repo.delete(id);
    this.logger.log(`Resume deleted: ${id}`);
  }

  /**
   * 手动重新触发解析
   */
  async reparse(id: string, userId: string): Promise<ResumeEntity> {
    const resume = await this.findOne(id, userId);
    if (resume.status === 'parsing') {
      throw new BadRequestException('简历正在解析中，请稍后再试');
    }
    await this.repo.update(id, { status: 'parsing', errorMessage: null });
    void this.parseResume(id);
    return this.repo.findOne({ where: { id } }) as Promise<ResumeEntity>;
  }

  /**
   * 获取简历文件原始内容（用于下载/预览）
   */
  async getFileContent(id: string, userId: string): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    await this.findOne(id, userId);
    const withContent = await this.repo
      .createQueryBuilder('r')
      .addSelect('r.fileContent')
      .where('r.id = :id', { id })
      .getOne();

    if (!withContent?.fileContent) {
      throw new NotFoundException('文件内容不存在');
    }
    return {
      buffer: withContent.fileContent,
      mimeType: withContent.mimeType,
      originalName: withContent.originalName,
    };
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────────

  /**
   * 调用 Gemini API 对简历文件进行真实 AI 解析
   * 直接将文件二进制以 inline_data（base64）形式发送，无需本地文本提取
   */
  private async parseResume(id: string): Promise<void> {
    try {
      // 读取文件内容（需要 fileContent 字段）
      const withContent = await this.repo
        .createQueryBuilder('r')
        .addSelect('r.fileContent')
        .where('r.id = :id', { id })
        .getOne();

      if (!withContent?.fileContent) {
        throw new Error('文件内容不存在，无法解析');
      }

      this.logger.log(`Starting Gemini parse: ${id}`);

      const result = await this.gemini.parseResume(withContent.fileContent, withContent.mimeType);

      await this.repo.update(id, {
        status: 'done',
        score: result.score,
        parsedContent: result.parsedContent,
        interviewFocus: result.interviewFocus,
        dimensionScores: result.dimensionScores,
        errorMessage: null,
      });

      this.logger.log(`Resume parsed successfully: ${id}, score: ${result.score}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Resume parse failed: ${id}, ${message}`);
      await this.repo.update(id, { status: 'error', errorMessage: message });
    }
  }
}
