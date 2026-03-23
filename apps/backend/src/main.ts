import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── 全局 API 前缀 ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── 全局管道：DTO 校验与转换 ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 自动过滤多余字段
      forbidNonWhitelisted: true, // 发现多余字段时抛错
      transform: true,           // 自动类型转换（如字符串转数字）
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── 全局拦截器：class-transformer @Exclude/@Expose ────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, { excludeExtraneousValues: false }),
    new SerializeInterceptor(),
  );

  // ─── 全局异常过滤器：统一错误响应格式 ─────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Swagger 文档 ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CodeCV API')
      .setDescription('AI 简历分析与面试辅助系统接口文档')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger UI: http://localhost:3000/docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/api`);
}

void bootstrap();
