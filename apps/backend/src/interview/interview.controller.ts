import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { InterviewService } from './interview.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { DeleteSessionsDto } from './dto/delete-sessions.dto';

@ApiTags('Interview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * 获取或自动生成简历对应题目
   * GET /api/interview/questions/:resumeId
   */
  @Get('questions/:resumeId')
  @ApiOperation({ summary: '获取或生成简历面试题目' })
  async getQuestions(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const questions = await this.interviewService.getOrGenerateQuestions(resumeId, user.sub);
    return { questions };
  }

  /**
   * 重新生成题目（覆盖旧题目）
   * POST /api/interview/questions/:resumeId/regenerate
   */
  @Post('questions/:resumeId/regenerate')
  @ApiOperation({ summary: '重新生成面试题目' })
  async regenerateQuestions(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const questions = await this.interviewService.regenerateQuestions(resumeId, user.sub);
    return { questions };
  }

  /**
   * 开始面试会话（自动生成题目并创建会话）
   * POST /api/interview/session/start/:resumeId
   */
  @Post('session/start/:resumeId')
  @ApiOperation({ summary: '开始面试会话' })
  async startSession(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.interviewService.startSession(resumeId, user.sub);
  }

  /**
   * 提交答卷
   * POST /api/interview/session/:sessionId/submit
   */
  @Post('session/:sessionId/submit')
  @ApiOperation({ summary: '提交答卷并计算得分' })
  async submitSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.interviewService.submitSession(sessionId, user.sub, dto);
  }

  /**
   * 获取面试记录列表
   * GET /api/interview/sessions
   */
  @Get('sessions')
  @ApiOperation({ summary: '获取当前用户面试记录' })
  async getSessions(
    @CurrentUser() user: JwtUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.interviewService.getSessions(user.sub, limit, offset);
  }

  /**
   * 获取面试会话详情（含题目 + 答案）
   * GET /api/interview/session/:sessionId
   */
  @Get('session/:sessionId')
  @ApiOperation({ summary: '获取面试会话详情' })
  async getSessionDetail(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.interviewService.getSessionDetail(sessionId, user.sub);
  }

  /**
   * 删除单条面试记录
   * DELETE /api/interview/session/:sessionId
   */
  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除单条面试记录' })
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.interviewService.deleteSession(sessionId, user.sub);
  }

  /**
   * 批量删除面试记录
   * DELETE /api/interview/sessions/batch
   */
  @Delete('sessions/batch')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '批量删除面试记录' })
  async deleteSessions(
    @Body() dto: DeleteSessionsDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.interviewService.deleteSessions(dto.ids, user.sub);
  }
}
