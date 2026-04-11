import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeSpaceEntity } from './entities/knowledge-space.entity';
import { KnowledgeArticleEntity } from './entities/knowledge-article.entity';
import { KnowledgeChunkEntity } from './entities/knowledge-chunk.entity';
import { RagService } from './rag.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(KnowledgeSpaceEntity)
    private spaceRepo: Repository<KnowledgeSpaceEntity>,
    @InjectRepository(KnowledgeArticleEntity)
    private articleRepo: Repository<KnowledgeArticleEntity>,
    @InjectRepository(KnowledgeChunkEntity)
    private chunkRepo: Repository<KnowledgeChunkEntity>,
    private ragService: RagService,
  ) {}

  // ─── 知识库空间 CRUD ─────────────────────────────────────────────────────────

  async listSpaces(userId: string) {
    const spaces = await this.spaceRepo.find({ where: { userId } });

    // 聚合每个空间的文章数
    const ids = spaces.map((s) => s.id);
    if (ids.length === 0) return { items: [], total: 0 };

    const counts = await this.articleRepo
      .createQueryBuilder('a')
      .select('a.spaceId', 'spaceId')
      .addSelect('COUNT(*)', 'count')
      .where('a.spaceId IN (:...ids)', { ids })
      .groupBy('a.spaceId')
      .getRawMany<{ spaceId: number; count: string }>();

    const countMap = Object.fromEntries(counts.map((r) => [r.spaceId, Number(r.count)]));

    return {
      items: spaces.map((s) => ({ ...s, articleCount: countMap[s.id] ?? 0 })),
      total: spaces.length,
    };
  }

  async getSpace(id: number, userId: string) {
    const space = await this.spaceRepo.findOne({ where: { id } });
    if (!space) throw new NotFoundException('知识库不存在');
    if (space.userId !== userId) throw new ForbiddenException('无权访问');
    return space;
  }

  async createSpace(dto: CreateSpaceDto, userId: string) {
    const space = this.spaceRepo.create({
      ...dto,
      coverColor: dto.coverColor ?? '#6366f1',
      userId,
    });
    return this.spaceRepo.save(space);
  }

  async updateSpace(id: number, dto: UpdateSpaceDto, userId: string) {
    const space = await this.getSpace(id, userId);
    Object.assign(space, dto);
    return this.spaceRepo.save(space);
  }

  async deleteSpace(id: number, userId: string) {
    const space = await this.getSpace(id, userId);
    await this.ragService.deleteChunksBySpace(id);
    await this.spaceRepo.remove(space);
  }

  // ─── 文章 CRUD ────────────────────────────────────────────────────────────────

  async listArticles(spaceId: number, userId: string) {
    await this.getSpace(spaceId, userId);
    const articles = await this.articleRepo.find({
      where: { spaceId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return { items: articles, total: articles.length };
  }

  async getArticle(id: number) {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');
    return article;
  }

  async createArticle(dto: CreateArticleDto, userId: string) {
    await this.getSpace(dto.spaceId, userId);

    const article = this.articleRepo.create({
      title: dto.title,
      content: dto.content ?? '',
      tags: dto.tags ?? [],
      source: 'manual',
      spaceId: dto.spaceId,
      sortOrder: Date.now(),
    });
    const saved = await this.articleRepo.save(article);

    // 异步生成嵌入（不阻塞响应）
    if (saved.content) {
      this.ragService
        .upsertChunks(saved.id, saved.spaceId, saved.content, saved.title)
        .catch((err) => this.logger.warn(`文章 ${saved.id} 嵌入失败: ${String(err)}`));
    }

    return saved;
  }

  async updateArticle(id: number, dto: UpdateArticleDto, userId: string) {
    const article = await this.getArticle(id);
    await this.getSpace(article.spaceId, userId);

    Object.assign(article, dto);
    const saved = await this.articleRepo.save(article);

    // 内容变化时重新生成嵌入
    if (dto.content !== undefined) {
      this.ragService
        .upsertChunks(saved.id, saved.spaceId, saved.content, saved.title)
        .catch((err) => this.logger.warn(`文章 ${saved.id} 更新嵌入失败: ${String(err)}`));
    }

    return saved;
  }

  async deleteArticle(id: number, userId: string) {
    const article = await this.getArticle(id);
    await this.getSpace(article.spaceId, userId);
    await this.ragService.deleteChunks(id);
    await this.articleRepo.remove(article);
  }

  // ─── 文件上传解析 ─────────────────────────────────────────────────────────────

  async uploadArticle(
    spaceId: number,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.getSpace(spaceId, userId);

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const title = file.originalname.replace(/\.[^.]+$/, '');

    // 提取文本
    let content = '';
    try {
      content = await this.extractText(file.buffer, ext, title);
    } catch (err) {
      this.logger.warn(`文件解析失败: ${String(err)}`);
    }

    const article = this.articleRepo.create({
      title,
      content,
      tags: [],
      source: 'upload',
      originalFileName: file.originalname,
      fileFormat: ext,
      fileSize: file.size,
      uploadStatus: content ? 'parsed' : 'failed',
      spaceId,
      sortOrder: Date.now(),
    });
    const saved = await this.articleRepo.save(article);

    if (content) {
      this.ragService
        .upsertChunks(saved.id, saved.spaceId, content, title)
        .catch((err) => this.logger.warn(`上传文章 ${saved.id} 嵌入失败: ${String(err)}`));
    }

    return saved;
  }

  async retryArticleParsing(id: number, userId: string) {
    const article = await this.getArticle(id);
    await this.getSpace(article.spaceId, userId);

    if (article.source !== 'upload') {
      throw new ForbiddenException('仅支持上传来源的文章重新解析');
    }

    article.uploadStatus = 'parsing';
    await this.articleRepo.save(article);

    // 触发重新嵌入
    if (article.content) {
      this.ragService
        .upsertChunks(article.id, article.spaceId, article.content, article.title)
        .then(async () => {
          article.uploadStatus = 'parsed';
          await this.articleRepo.save(article);
        })
        .catch(async (err) => {
          this.logger.warn(`重试解析失败: ${String(err)}`);
          article.uploadStatus = 'failed';
          await this.articleRepo.save(article);
        });
    }

    return article;
  }

  // ─── 私有工具 ─────────────────────────────────────────────────────────────────

  private async extractText(buffer: Buffer, ext: string, title: string): Promise<string> {
    switch (ext) {
      case 'pdf': {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        return result.text?.trim() ?? '';
      }
      case 'docx':
      case 'doc': {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth') as {
          extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
        };
        const result = await mammoth.extractRawText({ buffer });
        return result.value?.trim() ?? '';
      }
      case 'md':
      case 'txt':
      case 'js':
      case 'ts':
      case 'vue':
        return buffer.toString('utf-8');
      default:
        this.logger.warn(`不支持的文件类型: ${ext}，尝试按 UTF-8 读取`);
        return buffer.toString('utf-8');
    }
  }
}
