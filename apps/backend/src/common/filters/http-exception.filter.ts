import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 全局 HTTP 异常过滤器
 * 统一所有异常的响应格式：{ code, message, path, timestamp }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message ??
          exception.message;

    // 将 class-validator 的数组消息合并为字符串
    const errorMessage = Array.isArray(message) ? message.join('; ') : message;

    this.logger.warn(
      `[${request.method}] ${request.url} → ${status}: ${errorMessage}`,
    );

    response.status(status).json({
      code: status,
      message: errorMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
