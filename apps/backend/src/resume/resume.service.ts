import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ResumeEntity,
  ParsedResumeContent,
  InterviewFocus,
  DimensionScore,
} from './entities/resume.entity';
import type { ResumeListQueryDto } from './dto/resume-list-query.dto';

// ─── 允许的 MIME 类型 ──────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

// ─── Mock AI 解析数据（待后续接入真实 LLM 服务时替换） ─────────────────────────

function generateMockParsedContent(filename: string): ParsedResumeContent {
  const name = filename.replace(/\.(pdf|docx|doc)$/i, '').split(/[-_\s]/)[0] ?? '候选人';
  return {
    candidate: {
      name: name.length > 8 ? '候选人' : name,
      phone: '138****8888',
      email: 'candidate@example.com',
      location: '北京',
      experience: '3 年工作经验',
    },
    summary:
      '资深前端工程师，专注于 Vue3 / React 技术栈，主导过多个大型项目前端架构设计与重构，具备良好的工程化思维和性能优化经验。',
    experience: [
      {
        id: 1,
        company: '某科技公司',
        role: '高级前端工程师',
        period: '2022.06 — 2025.01',
        bullets: [
          '主导前端架构重构，引入微前端方案，构建时间缩短 40%',
          '封装公司级 UI 组件库，覆盖 30+ 基础组件，被多个业务团队采用',
          '参与大屏可视化项目，攻克亿级数据实时渲染性能瓶颈',
          '推动前端 CI/CD 流程建设，上线效率提升 60%',
        ],
      },
      {
        id: 2,
        company: '某互联网公司',
        role: '前端工程师',
        period: '2020.07 — 2022.05',
        bullets: [
          '负责核心业务模块的前端开发与迭代，FCP 从 3.2s 优化至 1.1s',
          '封装通用 WebSocket 数据流管理方案，支撑实时数据看板',
          '推动团队升级至 TypeScript，代码缺陷率下降约 35%',
        ],
      },
    ],
    skills: [
      { category: '前端框架', items: ['Vue3', 'React 18', 'Nuxt3', 'Next.js'] },
      { category: '工程化', items: ['Vite', 'Webpack5', 'Turbopack', 'pnpm'] },
      { category: '语言', items: ['TypeScript', 'JavaScript ES2022+', 'CSS3'] },
      { category: '后端 / 全栈', items: ['Node.js', 'NestJS', 'GraphQL', 'PostgreSQL'] },
    ],
    projects: [
      {
        id: 1,
        name: '企业级前端监控平台',
        period: '2023.03 — 2023.10',
        bullets: [
          '设计并实现 SDK 采集层，支持 JS 错误、性能指标、用户行为埋点',
          '引入 Source Map 解析方案，错误定位效率提升 70%',
          '可视化看板基于 ECharts + WebSocket 实时展示，支持 10w+ DAU',
        ],
      },
    ],
    education: [
      { school: '某重点大学', degree: '计算机科学与技术 · 学士', period: '2016 — 2020' },
    ],
  };
}

function generateMockInterviewFocus(): InterviewFocus[] {
  return [
    {
      id: 'tech',
      title: '技术深度',
      color: '#4f46e5',
      topics: [
        { label: 'Vue3 响应式原理', weight: 'high', desc: '深入考察 Proxy/Reflect、track/trigger 机制' },
        { label: 'React Hooks 原理', weight: 'high', desc: 'useState/useEffect 底层实现与闭包陷阱' },
        { label: 'TypeScript 类型系统', weight: 'medium', desc: '泛型、条件类型、映射类型' },
        { label: '浏览器渲染机制', weight: 'medium', desc: '重排重绘、合成层、事件循环' },
      ],
    },
    {
      id: 'architecture',
      title: '系统设计',
      color: '#0ea5e9',
      topics: [
        { label: '微前端架构', weight: 'high', desc: '结合项目经历深入追问 qiankun 原理与难点' },
        { label: '组件库设计', weight: 'high', desc: '组件封装思路、文档规范、版本管理' },
        { label: '前端工程化', weight: 'medium', desc: 'Vite/Webpack 构建优化、Tree-shaking' },
      ],
    },
    {
      id: 'project',
      title: '项目亮点',
      color: '#16a34a',
      topics: [
        { label: '大屏性能优化', weight: 'high', desc: '追问亿级数据渲染方案，虚拟列表/Canvas' },
        { label: 'CI/CD 流程建设', weight: 'medium', desc: '具体方案、遇到的挑战及解决思路' },
        { label: 'FCP 从 3.2s 到 1.1s', weight: 'high', desc: '具体优化手段，分析工具使用' },
      ],
    },
    {
      id: 'performance',
      title: '性能优化',
      color: '#d97706',
      topics: [
        { label: '首屏加载优化', weight: 'high', desc: '代码分割、懒加载、预加载策略' },
        { label: 'Bundle 分析', weight: 'medium', desc: '使用什么工具分析，如何减小体积' },
        { label: 'WebSocket 大数据', weight: 'medium', desc: '数据量大时的渲染策略和内存管理' },
      ],
    },
    {
      id: 'soft',
      title: '综合能力',
      color: '#7c3aed',
      topics: [
        { label: '技术推广与落地', weight: 'medium', desc: '如何推动组件库在多团队落地' },
        { label: '技术决策思路', weight: 'medium', desc: '微前端选型依据与取舍' },
        { label: '项目复盘能力', weight: 'low', desc: '如何总结和沉淀项目经验' },
      ],
    },
  ];
}

function generateMockDimensionScores(): DimensionScore[] {
  return [
    { label: '技术深度', score: 88, color: '#4f46e5' },
    { label: '项目质量', score: 85, color: '#0ea5e9' },
    { label: '工程素养', score: 82, color: '#16a34a' },
    { label: '表达清晰度', score: 76, color: '#d97706' },
    { label: '综合匹配度', score: 80, color: '#7c3aed' },
  ];
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectRepository(ResumeEntity)
    private readonly repo: Repository<ResumeEntity>,
  ) {}

  /**
   * 上传简历文件并触发 AI 解析（memoryStorage，文件内容存入数据库）
   */
  async upload(userId: string, file: Express.Multer.File): Promise<ResumeEntity> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('仅支持 PDF / DOCX 格式的简历文件');
    }

    const resume = this.repo.create({
      userId,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileContent: file.buffer,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'parsing',
    });

    const saved = await this.repo.save(resume);
    this.logger.log(`Resume uploaded: ${saved.id} by user ${userId}`);

    void this.parseResume(saved.id, file.originalname);

    return saved;
  }

  /**
   * 查询当前用户的简历列表（分页）
   */
  async findAll(
    userId: string,
    query: ResumeListQueryDto,
  ): Promise<{ items: ResumeEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .orderBy('r.createTime', 'DESC')
      .take(query.limit ?? 20)
      .skip(query.offset ?? 0);

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * 获取单份简历详情（校验归属权）
   */
  async findOne(id: string, userId: string): Promise<ResumeEntity> {
    const resume = await this.repo.findOne({ where: { id } });
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
    if (resume.userId !== userId) {
      throw new ForbiddenException('无权访问此简历');
    }
    return resume;
  }

  /**
   * 删除简历记录（文件存在 DB，随行删除）
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.repo.delete(id);
    this.logger.log(`Resume deleted: ${id}`);
  }

  /**
   * 手动重新触发解析
   */
  async reparse(id: string, userId: string): Promise<ResumeEntity> {
    const resume = await this.findOne(id, userId);
    if (resume.status === 'parsing') {
      throw new BadRequestException('简历正在解析中，请稍后再试');
    }
    await this.repo.update(id, { status: 'parsing', errorMessage: null });
    void this.parseResume(id, resume.originalName);
    return this.repo.findOne({ where: { id } }) as Promise<ResumeEntity>;
  }

  /**
   * 获取简历文件原始内容（用于下载/预览）
   */
  async getFileContent(id: string, userId: string): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    await this.findOne(id, userId);
    const withContent = await this.repo
      .createQueryBuilder('r')
      .addSelect('r.fileContent')
      .where('r.id = :id', { id })
      .getOne();

    if (!withContent?.fileContent) {
      throw new NotFoundException('文件内容不存在');
    }
    return {
      buffer: withContent.fileContent,
      mimeType: withContent.mimeType,
      originalName: withContent.originalName,
    };
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────────

  /**
   * Mock AI 解析简历
   * TODO: 接入真实 LLM 服务（OpenAI / 文心 / 通义）时替换此方法
   */
  private async parseResume(id: string, filename: string): Promise<void> {
    try {
      await this.delay(1500 + Math.random() * 1500);

      const score = 70 + Math.floor(Math.random() * 20);
      await this.repo.update(id, {
        status: 'done',
        score,
        parsedContent: generateMockParsedContent(filename),
        interviewFocus: generateMockInterviewFocus(),
        dimensionScores: generateMockDimensionScores(),
        errorMessage: null,
      });

      this.logger.log(`Resume parsed: ${id}, score: ${score}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Resume parse failed: ${id}, ${message}`);
      await this.repo.update(id, { status: 'error', errorMessage: message });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
