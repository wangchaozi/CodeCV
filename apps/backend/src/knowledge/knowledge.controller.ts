import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type JwtUser } from '../auth/current-user.decorator';
import { KnowledgeService } from './knowledge.service';
import { RagService } from './rag.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { RagChatDto } from './dto/rag-chat.dto';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly ragService: RagService,
  ) {}

  // ─── 知识库空间 ────────────────────────────────────────────────────────────────

  @Get('spaces')
  listSpaces(@CurrentUser() user: JwtUser) {
    return this.knowledgeService.listSpaces(user.sub);
  }

  @Get('spaces/:id')
  getSpace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.getSpace(id, user.sub);
  }

  @Post('spaces')
  createSpace(@Body() dto: CreateSpaceDto, @CurrentUser() user: JwtUser) {
    return this.knowledgeService.createSpace(dto, user.sub);
  }

  @Patch('spaces/:id')
  updateSpace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.updateSpace(id, dto, user.sub);
  }

  @Delete('spaces/:id')
  deleteSpace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.deleteSpace(id, user.sub);
  }

  // ─── 文章 ──────────────────────────────────────────────────────────────────────

  @Get('spaces/:spaceId/articles')
  listArticles(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.listArticles(spaceId, user.sub);
  }

  @Get('articles/:id')
  getArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.getArticle(id);
  }

  @Post('articles')
  createArticle(@Body() dto: CreateArticleDto, @CurrentUser() user: JwtUser) {
    return this.knowledgeService.createArticle(dto, user.sub);
  }

  @Patch('articles/:id')
  updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.updateArticle(id, dto, user.sub);
  }

  @Delete('articles/:id')
  deleteArticle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.deleteArticle(id, user.sub);
  }

  @Post('articles/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadArticle(
    @UploadedFile() file: Express.Multer.File,
    @Body('spaceId') spaceId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.uploadArticle(Number(spaceId), user.sub, file);
  }

  @Post('articles/:id/retry')
  retryArticleParsing(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.knowledgeService.retryArticleParsing(id, user.sub);
  }

  // ─── RAG 流式问答 ──────────────────────────────────────────────────────────────

  @Post('spaces/:spaceId/chat')
  @HttpCode(200)
  async chat(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() dto: RagChatDto,
    @Res() res: Response,
    @Req() _req: Request,
    @CurrentUser() user: JwtUser,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. 权限检查 & 向量检索
      await this.knowledgeService.getSpace(spaceId, user.sub);
      const chunks = await this.ragService.retrieveChunks(
        spaceId,
        dto.question,
      );

      // 2. 推送来源列表
      const sources = [
        ...new Set(chunks.map((c) => c.articleTitle).filter(Boolean)),
      ];
      sendEvent({ type: 'sources', sources });

      // 3. 流式生成
      await this.ragService.streamChat(
        chunks,
        dto.question,
        dto.history ?? [],
        (token) => sendEvent({ type: 'token', text: token }),
      );

      sendEvent({ type: 'done' });
    } catch (err) {
      sendEvent({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      res.end();
    }
  }
}
