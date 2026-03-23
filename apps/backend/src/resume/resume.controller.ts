import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ResumeService } from './resume.service';
import { ResumeEntity } from './entities/resume.entity';
import { ResumeListQueryDto } from './dto/resume-list-query.dto';

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

@ApiTags('Resume')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * 上传简历文件（存入数据库 bytea 列）
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '上传简历（PDF / DOCX，内容存入 DB）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '简历文件（PDF / DOCX，≤ 20 MB）' },
      },
    },
  })
  @ApiResponse({ status: 201, type: ResumeEntity })
  @ApiResponse({ status: 400, description: '文件格式或大小不符合要求' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME.includes(file.mimetype));
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUser,
  ): Promise<ResumeEntity> {
    return this.resumeService.upload(user.sub, file);
  }

  /**
   * 获取当前用户的简历列表（分页）
   */
  @Get()
  @ApiOperation({ summary: '获取当前用户的简历列表' })
  @ApiResponse({ status: 200 })
  findAll(
    @CurrentUser() user: JwtUser,
    @Query() query: ResumeListQueryDto,
  ): Promise<{ items: ResumeEntity[]; total: number }> {
    return this.resumeService.findAll(user.sub, query);
  }

  /**
   * 获取单份简历详情（含解析结果和面试侧重点）
   */
  @Get(':id')
  @ApiOperation({ summary: '获取简历详情（含解析结果）' })
  @ApiParam({ name: 'id', description: '简历 UUID' })
  @ApiResponse({ status: 200, type: ResumeEntity })
  @ApiResponse({ status: 403, description: '无权访问此简历' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<ResumeEntity> {
    return this.resumeService.findOne(id, user.sub);
  }

  /**
   * 下载/预览简历原始文件（从 DB 读取 bytea 直接返回）
   */
  @Get(':id/download')
  @ApiOperation({ summary: '下载简历原始文件' })
  @ApiParam({ name: 'id', description: '简历 UUID' })
  @ApiResponse({ status: 200, description: '返回文件二进制内容' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType, originalName } = await this.resumeService.getFileContent(id, user.sub);
    // 确保是标准 Node.js Buffer（PostgreSQL bytea 有时以 Uint8Array 返回）
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    res.setHeader('Content-Length', buf.byteLength);
    res.end(buf);
  }

  /**
   * 手动重新触发 AI 解析
   */
  @Post(':id/reparse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新触发 AI 解析' })
  @ApiParam({ name: 'id', description: '简历 UUID' })
  @ApiResponse({ status: 200, description: '已触发重新解析' })
  reparse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<ResumeEntity> {
    return this.resumeService.reparse(id, user.sub);
  }

  /**
   * 删除简历记录
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除简历' })
  @ApiParam({ name: 'id', description: '简历 UUID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    return this.resumeService.remove(id, user.sub);
  }
}
