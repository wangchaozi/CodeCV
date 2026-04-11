import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunkEntity } from './entities/knowledge-chunk.entity';
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
  private readonly apiBase = 'https://generativelanguage.googleapis.com';
  private readonly embeddingModel = 'text-embedding-004';
  private readonly chatModel = 'gemini-2.0-flash';
  private readonly fetchTimeoutMs: number;

  constructor(
    private configService: ConfigService,
    @InjectRepository(KnowledgeChunkEntity)
    private chunkRepo: Repository<KnowledgeChunkEntity>,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.fetchTimeoutMs = this.configService.get<number>('GEMINI_FETCH_TIMEOUT_MS', 120_000);
  }

  // ─── 嵌入 API ─────────────────────────────────────────────────────────────────

  async embedText(text: string): Promise<number[]> {
    const url = `${this.apiBase}/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      throw new InternalServerErrorException(`Embedding 网络请求失败: ${String(err)}`);
    }

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Embedding API error ${res.status}: ${body.slice(0, 500)}`);
      throw new InternalServerErrorException(`Embedding API 调用失败: ${res.status}`);
    }

    const data = (await res.json()) as { embedding?: { values: number[] } };
    return data.embedding?.values ?? [];
  }

  // ─── 分块管理 ─────────────────────────────────────────────────────────────────

  async upsertChunks(
    articleId: number,
    spaceId: number,
    content: string,
    articleTitle: string,
  ): Promise<void> {
    if (!content?.trim()) return;

    // 删除旧 chunks
    await this.chunkRepo.delete({ articleId });

    const textChunks = this.splitIntoChunks(content);
    this.logger.log(`[RAG] 生成 ${textChunks.length} 个分块 | articleId=${articleId}`);

    for (let i = 0; i < textChunks.length; i++) {
      try {
        const embedding = await this.embedText(textChunks[i]);
        await this.chunkRepo.save(
          this.chunkRepo.create({
            content: textChunks[i],
            embedding,
            chunkIndex: i,
            articleId,
            spaceId,
          }),
        );
      } catch (err) {
        this.logger.warn(`[RAG] chunk ${i} 嵌入失败，跳过 | ${String(err)}`);
      }
    }

    this.logger.log(`[RAG] 分块向量化完成 | articleId=${articleId} title="${articleTitle}"`);
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
    const queryEmbedding = await this.embedText(question);

    // 加载空间内所有带 embedding 的 chunk
    const chunks = await this.chunkRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.article', 'a')
      .where('c.spaceId = :spaceId', { spaceId })
      .andWhere('c.embedding IS NOT NULL')
      .getMany();

    if (chunks.length === 0) return [];

    const scored = chunks
      .map((c) => ({
        content: c.content,
        articleId: c.articleId,
        articleTitle: c.article?.title ?? '',
        score: this.cosineSimilarity(queryEmbedding, c.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this.logger.log(
      `[RAG] 检索完成 | spaceId=${spaceId} chunkTotal=${chunks.length} topK=${topK} topScore=${scored[0]?.score.toFixed(4)}`,
    );

    return scored;
  }

  // ─── 流式问答 ─────────────────────────────────────────────────────────────────

  /**
   * 调用 Gemini streamGenerateContent，将 token 通过 onToken 回调逐字符推送。
   * 完成后返回拼接的完整文本。
   */
  async streamChat(
    chunks: RetrievedChunk[],
    question: string,
    history: ChatHistoryItemDto[] = [],
    onToken: (text: string) => void,
  ): Promise<string> {
    const context =
      chunks.length > 0
        ? chunks.map((c) => `【来源：${c.articleTitle}】\n${c.content}`).join('\n\n---\n\n')
        : '（当前知识库中暂无相关内容）';

    const systemContext = `你是一个专业的面试知识问答助手。请根据以下从知识库中检索到的相关内容来回答用户的问题。

===知识库相关内容===
${context}
===知识库内容结束===

规则：
1. 优先基于知识库内容回答，给出准确、有深度的解释
2. 如知识库内容不足以回答，可结合你的通用知识补充，但要说明
3. 回答要结构清晰，适当使用标题、代码块、列表
4. 使用中文回答`;

    // 构建对话内容（含多轮历史）
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // 系统上下文以第一条 user 消息注入
    if (history.length === 0) {
      contents.push({ role: 'user', parts: [{ text: `${systemContext}\n\n用户问题：${question}` }] });
    } else {
      // 首轮带上系统 prompt，后续轮次正常交替
      const firstUserMsg = history[0];
      contents.push({
        role: 'user',
        parts: [{ text: `${systemContext}\n\n用户问题：${firstUserMsg.content}` }],
      });

      for (let i = 1; i < history.length; i++) {
        const msg = history[i];
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      contents.push({ role: 'user', parts: [{ text: question }] });
    }

    const url = `${this.apiBase}/v1beta/models/${this.chatModel}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(this.fetchTimeoutMs),
      });
    } catch (err) {
      throw new InternalServerErrorException(`Chat 网络请求失败: ${String(err)}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`[RAG Chat] HTTP ${response.status}: ${errText.slice(0, 500)}`);
      throw new InternalServerErrorException(`Gemini Chat API 调用失败: ${response.status}`);
    }

    // 逐行读取 SSE 流
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
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
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

  private splitIntoChunks(text: string, chunkSize = 800, overlap = 150): string[] {
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
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
