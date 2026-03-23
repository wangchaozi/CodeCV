import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

/**
 * 全局序列化拦截器
 * 自动将 class-transformer 的 @Exclude / @Expose 装饰器应用到所有响应
 * 确保密码等敏感字段不会意外泄露
 */
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) =>
        instanceToPlain(data, { excludeExtraneousValues: false }),
      ),
    );
  }
}
