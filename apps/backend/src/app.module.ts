import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ResumeModule } from './resume/resume.module';
import { InterviewModule } from './interview/interview.module';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  imports: [
    // ─── 全局环境变量配置 ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── 数据库连接（异步读取配置） ─────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DB_HOST', '127.0.0.1'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('DB_USERNAME', 'root'),
        password: cfg.get<string>('DB_PASSWORD', '123456'),
        database: cfg.get<string>('DB_DATABASE', 'ai_resume_platform'),
        // 自动扫描所有 Entity，无需在此手动列举
        autoLoadEntities: true,
        // 生产环境务必设置 DB_SYNC=false，改用迁移文件
        synchronize: cfg.get<string>('DB_SYNC', 'false') === 'true',
        logging: cfg.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),

    UserModule,
    AuthModule,
    ResumeModule,
    InterviewModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
