import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunkEntity } from './entities/knowledge-chunk.entity';
import { KnowledgeArticleEntity } from './entities/knowledge-article.entity';
import type { ChatHistoryItemDto } from './dto/rag-chat.dto';

interface RetrievedChunk {
  content: string;
  articleId: number;
  articleTitle: string;
  score: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly chatModel: string;
  private readonly embeddingModel = 'text-embedding-ada-002';
  private readonly fetchTimeoutMs: number;

  constructor(
    private configService: ConfigService,
    @InjectRepository(KnowledgeChunkEntity)
    private chunkRepo: Repository<KnowledgeChunkEntity>,
    @InjectRepository(KnowledgeArticleEntity)
    private articleRepo: Repository<KnowledgeArticleEntity>,
  ) {
    this.apiKey = (this.configService.get('GEMINI_API_KEY') as string) ?? '';
    this.apiBase =
      (this.configService.get('GEMINI_API_BASE') as string) ??
      'https://api.vectorengine.ai';
    this.chatModel =
      (this.configService.get('GEMINI_MODEL') as string) ??
      'gemini-3.1-pro-preview';
    const timeoutRaw = this.configService.get('GEMINI_FETCH_TIMEOUT_MS') as
      | string
      | undefined;
    const parsed = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : NaN;
    this.fetchTimeoutMs =
      Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
  }

  // ─── 嵌入 API ─────────────────────────────────────────────────────────────────

  async embedText(text: string): Promise<number[]> {
    const url = `${this.apiBase}/v1/embeddings`;
    this.logger.debug(
      `[RAG] Embedding 请求 | base=${this.apiBase} model=${this.embeddingModel}`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.embeddingModel, input: text }),
      signal: AbortSignal.timeout(this.fetchTimeoutMs),
    }).catch((err: unknown) => {
      this.logger.error(`[RAG] Embedding 请求失败: ${String(err)}`);
      throw new InternalServerErrorException(
        `Embedding 网络请求失败: ${String(err)}`,
      );
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Embedding API error ${res.status}: ${body.slice(0, 500)}`);
      throw new InternalServerErrorException(
        `Embedding API 调用失败: ${res.status}`,
      );
    }

    const data = (await res.json()) as { data?: { embedding: number[] }[] };
    return data.data?.[0]?.embedding ?? [];
  }

  // ─── 分块管理 ─────────────────────────────────────────────────────────────────

  async upsertChunks(
    articleId: number,
    spaceId: number,
    content: string,
    articleTitle: string,
  ): Promise<void> {
    if (!content?.trim()) return;

    await this.chunkRepo.delete({ articleId });

    const textChunks = this.splitIntoChunks(content);
    this.logger.log(
      `[RAG] 生成 ${textChunks.length} 个分块 | articleId=${articleId}`,
    );

    const saved = await Promise.all(
      textChunks.map((text, i) =>
        this.chunkRepo.save(
          this.chunkRepo.create({
            content: text,
            embedding: null,
            chunkIndex: i,
            articleId,
            spaceId,
          }),
        ),
      ),
    );
    this.logger.log(
      `[RAG] 文本块已保存 | articleId=${articleId} count=${saved.length}`,
    );

    void this.enrichEmbeddings(saved, articleId, articleTitle);
  }

  private async enrichEmbeddings(
    chunks: KnowledgeChunkEntity[],
    articleId: number,
    articleTitle: string,
  ): Promise<void> {
    let enriched = 0;
    for (const chunk of chunks) {
      try {
        chunk.embedding = await this.embedText(chunk.content);
        await this.chunkRepo.save(chunk);
        enriched++;
      } catch (err) {
        this.logger.warn(
          `[RAG] chunk ${chunk.chunkIndex} 向量化失败 | ${String(err)}`,
        );
        break;
      }
    }
    this.logger.log(
      `[RAG] 向量化完成 | articleId=${articleId} title="${articleTitle}" enriched=${enriched}/${chunks.length}`,
    );
  }

  async reindexSpace(spaceId: number): Promise<void> {
    const nullChunks = await this.chunkRepo.find({
      where: { spaceId, embedding: null as unknown as number[] },
    });

    this.logger.log(
      `[RAG] 开始补充向量 | spaceId=${spaceId} 待处理块数=${nullChunks.length}`,
    );

    let success = 0;
    for (const chunk of nullChunks) {
      try {
        chunk.embedding = await this.embedText(chunk.content);
        await this.chunkRepo.save(chunk);
        success++;
      } catch (err) {
        this.logger.warn(`[RAG] reindex chunk ${chunk.id} 失败 | ${String(err)}`);
        break;
      }
    }

    this.logger.log(
      `[RAG] 补充向量完成 | spaceId=${spaceId} 成功=${success}/${nullChunks.length}`,
    );
  }

  async deleteChunks(articleId: number): Promise<void> {
    await this.chunkRepo.delete({ articleId });
  }

  async deleteChunksBySpace(spaceId: number): Promise<void> {
    await this.chunkRepo.delete({ spaceId });
  }

  // ─── 检索 ─────────────────────────────────────────────────────────────────────

  async retrieveChunks(
    spaceId: number,
    question: string,
    topK = 5,
  ): Promise<RetrievedChunk[]> {
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.embedText(question);
      this.logger.log(`[RAG] 问题向量化成功 | dim=${queryEmbedding.length}`);
    } catch (err) {
      this.logger.warn(`[RAG] 问题向量化失败，降级原因: ${String(err)}`);
    }

    if (queryEmbedding) {
      const totalChunks = await this.chunkRepo.count({ where: { spaceId } });
      const chunks = await this.chunkRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.article', 'a')
        .where('c.spaceId = :spaceId', { spaceId })
        .andWhere('c.embedding IS NOT NULL')
        .getMany();

      this.logger.log(
        `[RAG] 向量块统计 | spaceId=${spaceId} 总块数=${totalChunks} 有向量块数=${chunks.length}`,
      );

      if (chunks.length > 0) {
        const scored = chunks
          .map((c) => ({
            content: c.content,
            articleId: c.articleId,
            articleTitle: c.article?.title ?? '',
            score: this.cosineSimilarity(queryEmbedding!, c.embedding!),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        this.logger.log(
          `[RAG] 向量检索完成 | spaceId=${spaceId} total=${chunks.length} topScore=${scored[0]?.score.toFixed(4)}`,
        );
        return scored;
      }

      this.logger.warn(
        `[RAG] 库中无向量块，降级至全文检索 | spaceId=${spaceId} totalChunks=${totalChunks}`,
      );
    }

    this.logger.log(`[RAG] 降级至全文检索 | spaceId=${spaceId}`);
    return this.keywordSearch(spaceId, question, topK);
  }

  private async keywordSearch(
    spaceId: number,
    question: string,
    topK: number,
  ): Promise<RetrievedChunk[]> {
    const keywords = question
      .split(/[\s，。？！、,!?；;:：\n]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1)
      .slice(0, 8);

    const chunkCount = await this.chunkRepo.count({ where: { spaceId } });

    if (chunkCount > 0) {
      let qb = this.chunkRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.article', 'a')
        .where('c.spaceId = :spaceId', { spaceId });

      if (keywords.length > 0) {
        const orConditions = keywords
          .map((_, i) => `c.content ILIKE :kw${i}`)
          .join(' OR ');
        const params: Record<string, string> = {};
        keywords.forEach((kw, i) => {
          params[`kw${i}`] = `%${kw}%`;
        });
        qb = qb.andWhere(`(${orConditions})`, params);
      }

      const matched = await qb.take(topK * 3).getMany();

      if (matched.length > 0) {
        const scored = matched
          .map((c) => ({
            content: c.content,
            articleId: c.articleId,
            articleTitle: c.article?.title ?? '',
            score: keywords.filter((kw) =>
              c.content.toLowerCase().includes(kw.toLowerCase()),
            ).length,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        this.logger.log(
          `[RAG] 全文检索完成 | spaceId=${spaceId} keywords=${keywords.join(',')} matched=${matched.length}`,
        );
        return scored;
      }

      const fallback = await this.chunkRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.article', 'a')
        .where('c.spaceId = :spaceId', { spaceId })
        .orderBy('c.chunkIndex', 'ASC')
        .take(topK)
        .getMany();

      return fallback.map((c) => ({
        content: c.content,
        articleId: c.articleId,
        articleTitle: c.article?.title ?? '',
        score: 0,
      }));
    }

    // chunks 表为空，直接查文章表兜底
    this.logger.warn(`[RAG] chunks 为空，查 knowledge_articles | spaceId=${spaceId}`);

    let artQb = this.articleRepo
      .createQueryBuilder('a')
      .where('a.spaceId = :spaceId', { spaceId });

    if (keywords.length > 0) {
      const orConditions = [
        keywords.map((_, i) => `a.title ILIKE :kw${i}`).join(' OR '),
        keywords.map((_, i) => `a.content ILIKE :kw${i}`).join(' OR '),
      ].join(' OR ');
      const params: Record<string, string> = {};
      keywords.forEach((kw, i) => {
        params[`kw${i}`] = `%${kw}%`;
      });
      artQb = artQb.andWhere(`(${orConditions})`, params);
    }

    const articles = await artQb.take(topK).getMany();

    if (articles.length === 0) {
      const allArticles = await this.articleRepo.find({
        where: { spaceId },
        take: topK,
      });
      return allArticles.map((a) => ({
        content: a.content ?? a.title,
        articleId: a.id,
        articleTitle: a.title,
        score: 0,
      }));
    }

    this.logger.log(`[RAG] 文章直查完成 | spaceId=${spaceId} matched=${articles.length}`);

    return articles.map((a) => ({
      content: a.content ?? a.title,
      articleId: a.id,
      articleTitle: a.title,
      score: keywords.filter(
        (kw) =>
          a.title.toLowerCase().includes(kw.toLowerCase()) ||
          (a.content ?? '').toLowerCase().includes(kw.toLowerCase()),
      ).length,
    }));
  }

  // ─── 流式问答 ─────────────────────────────────────────────────────────────────

  async streamChat(
    chunks: RetrievedChunk[],
    question: string,
    history: ChatHistoryItemDto[] = [],
    onToken: (text: string) => void,
  ): Promise<string> {
    const context =
      chunks.length > 0
        ? chunks
            .map((c) => `【来源：${c.articleTitle}】\n${c.content}`)
            .join('\n\n---\n\n')
        : '（当前知识库中暂无相关内容，请基于通用知识作答并注明）';

    const systemInstruction = {
      parts: [
        {
          text: `你是一个专业的面试知识问答助手。请根据以下从知识库中检索到的相关内容来回答用户的问题。

===知识库相关内容===
${context}
===知识库内容结束===

规则：
1. 优先基于知识库内容回答，给出准确、有深度的解释
2. 如知识库内容不足以回答，可结合你的通用知识补充，但要说明
3. 回答要结构清晰，适当使用标题、代码块、列表
4. 使用中文回答`,
        },
      ],
    };

    const contents = [
      ...history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: question }] },
    ];

    const url = `${this.apiBase}/v1beta/models/${this.chatModel}:streamGenerateContent?alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
      signal: AbortSignal.timeout(this.fetchTimeoutMs),
    }).catch((err: unknown) => {
      throw new InternalServerErrorException(
        `Chat 网络请求失败: ${String(err)}`,
      );
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`[RAG Chat] HTTP ${response.status}: ${errText.slice(0, 500)}`);
      throw new InternalServerErrorException(
        `Gemini Chat API 调用失败: ${response.status}`,
      );
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]' || raw === '') continue;

        try {
          const parsed = JSON.parse(raw) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch {
          // 忽略非 JSON 行
        }
      }
    }

    this.logger.log(`[RAG Chat] 完成 | totalChars=${fullText.length}`);
    return fullText;
  }

  // ─── 工具方法 ─────────────────────────────────────────────────────────────────

  private splitIntoChunks(
    text: string,
    chunkSize = 800,
    overlap = 150,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      if (end >= text.length) break;
      start += chunkSize - overlap;
    }

    return chunks.filter((c) => c.trim().length > 20);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
