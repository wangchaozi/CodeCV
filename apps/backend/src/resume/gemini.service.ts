import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ParsedResumeContent, InterviewFocus, DimensionScore } from './entities/resume.entity';

export interface GeminiParseResult {
  score: number;
  parsedContent: ParsedResumeContent;
  interviewFocus: InterviewFocus[];
  dimensionScores: DimensionScore[];
}

// ─── 简历解析 Prompt ──────────────────────────────────────────────────────────
// 要求模型输出严格的 JSON，结构与前端 TypeScript 接口完全对应
const RESUME_ANALYSIS_PROMPT = `
你是一位拥有10年经验的资深技术面试官和职业发展顾问，精通互联网大厂（BAT、FAANG）的招聘标准。
请仔细阅读附件中的简历文件，完成以下全面的结构化分析任务。

## 分析要求

### 1. 基本信息提取
- 准确提取候选人的姓名、联系方式、所在城市、总工作年限
- 若某项信息不存在，用合理的默认值或 "未提供" 填充

### 2. 个人能力概述（summary）
- 用2-4句话，站在面试官视角，客观总结候选人的核心竞争力
- 突出技术栈、行业经验、最亮眼的成就
- 语言简洁有力，避免空泛描述

### 3. 工作经历结构化
- 按时间倒序排列所有工作经历
- 每段经历的 bullets 精炼为3-5条，聚焦可量化的成就（含具体数据）
- 去掉流水账式描述，保留体现技术深度和业务价值的内容

### 4. 技能分类整理
- 将技能按类别分组：前端框架、后端/服务端、工程化工具、数据库、语言、云服务/DevOps 等
- 只列出简历中真实出现的技能，不要推断或添加

### 5. 项目经历结构化
- 每个项目的 bullets 聚焦技术方案、解决的难题、量化收益
- 若简历中没有独立项目区块，可从工作经历中提取重点项目

### 6. 学历信息提取
- 提取所有教育经历，包括学校、专业+学位、时间段

### 7. 面试侧重点分析（interviewFocus）
- 根据候选人简历内容，生成5个面试维度，每个维度包含3-5个具体考察点
- 维度分类建议：技术深度、系统设计、项目亮点、性能优化、综合能力（可根据简历实际内容调整）
- 每个考察点需包含：考察标签(label)、重要程度(high/medium/low)、具体考察方向(desc)
- desc 要具体，比如"追问XXX的技术选型原因及取舍"，而非泛泛的"考察技术能力"
- 颜色固定分配：第1个维度 #4f46e5，第2个 #0ea5e9，第3个 #16a34a，第4个 #d97706，第5个 #7c3aed

### 8. 维度评分（dimensionScores）
- 对以下5个维度进行100分制评分，评分要客观，体现真实差异（不要全部给80+）
- 维度及颜色固定为：
  - 技术深度（#4f46e5）：技术广度与深度，是否有底层原理理解
  - 项目质量（#0ea5e9）：项目规模、业务影响力、技术复杂度
  - 工程素养（#16a34a）：编码规范、工程化能力、架构意识
  - 表达清晰度（#d97706）：简历描述是否清晰、量化程度
  - 综合匹配度（#7c3aed）：与主流互联网岗位的整体匹配程度

### 9. 综合评分（score）
- 综合以上各维度，给出0-100的整体评分
- 评分标准：90+为顶尖候选人，80-89优秀，70-79良好，60-69一般，60以下较弱

## 输出格式要求

**必须且只输出一个合法的 JSON 对象**，不要有任何前缀文字、解释说明或 markdown 代码块标记。
JSON 结构严格如下：

{
  "score": <整数，0-100>,
  "parsedContent": {
    "candidate": {
      "name": "<姓名>",
      "phone": "<手机号，如不存在填'未提供'>",
      "email": "<邮箱，如不存在填'未提供'>",
      "location": "<城市>",
      "experience": "<如'5年工作经验'>"
    },
    "summary": "<候选人核心竞争力概述，2-4句话>",
    "experience": [
      {
        "id": <从1开始的整数>,
        "company": "<公司名>",
        "role": "<职位>",
        "period": "<时间段，如'2022.06 — 2025.01'>",
        "bullets": ["<成就描述1>", "<成就描述2>", ...]
      }
    ],
    "skills": [
      {
        "category": "<技能分类>",
        "items": ["<技能1>", "<技能2>", ...]
      }
    ],
    "projects": [
      {
        "id": <从1开始的整数>,
        "name": "<项目名>",
        "period": "<时间段>",
        "bullets": ["<技术亮点1>", "<技术亮点2>", ...]
      }
    ],
    "education": [
      {
        "school": "<学校名>",
        "degree": "<专业 · 学位>",
        "period": "<时间段，如'2016 — 2020'>"
      }
    ]
  },
  "interviewFocus": [
    {
      "id": "<英文标识符，如tech/architecture/project/performance/soft>",
      "title": "<维度名称>",
      "color": "<固定颜色值>",
      "topics": [
        {
          "label": "<考察点标签>",
          "weight": "<high|medium|low>",
          "desc": "<具体考察方向，20-50字>"
        }
      ]
    }
  ],
  "dimensionScores": [
    { "label": "技术深度", "score": <整数>, "color": "#4f46e5" },
    { "label": "项目质量", "score": <整数>, "color": "#0ea5e9" },
    { "label": "工程素养", "score": <整数>, "color": "#16a34a" },
    { "label": "表达清晰度", "score": <整数>, "color": "#d97706" },
    { "label": "综合匹配度", "score": <整数>, "color": "#7c3aed" }
  ]
}
`.trim();

// ─── Service ───────────────────────────────────────────────────────────────────

/** 仅用于日志：不打印完整 API Key */
function maskSecret(value: string, head = 6, tail = 4): string {
  if (!value) return '(empty)';
  if (value.length <= head + tail) return '***';
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly apiBase: string;
  private readonly fetchTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-3.1-pro-preview');
    this.apiBase = this.config.get<string>('GEMINI_API_BASE', 'https://api.vectorengine.ai');
    // 大文档 + 长 JSON 输出容易超过 120s，默认 300s，可通过环境变量调整
    const timeoutRaw = this.config.get<string>('GEMINI_FETCH_TIMEOUT_MS');
    const parsed = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : NaN;
    this.fetchTimeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
  }

  /**
   * 将简历文件（PDF / DOCX）直接发给 Gemini 进行结构化解析
   * 使用 inline_data 方式，无需本地文本提取
   */
  async parseResume(fileBuffer: Buffer, mimeType: string): Promise<GeminiParseResult> {
    const path = `/v1beta/models/${this.modelName}:generateContent`;
    const apiUrl = `${this.apiBase}${path}?key=${this.apiKey}`;
    const base64Data = fileBuffer.toString('base64');

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            {
              text: RESUME_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    };

    const bodyStr = JSON.stringify(requestBody);
    const approxBodyBytes = Buffer.byteLength(bodyStr, 'utf8');

    this.logger.log(
      `[Gemini] 准备请求 | baseUrl=${this.apiBase} path=${path} model=${this.modelName} mimeType=${mimeType}`,
    );
    this.logger.log(
      `[Gemini] 凭证 | apiKey=${maskSecret(this.apiKey)} hasKey=${Boolean(this.apiKey)}`,
    );
    this.logger.log(
      `[Gemini] 负载 | fileBytes=${fileBuffer.byteLength} base64Len=${base64Data.length} promptChars=${RESUME_ANALYSIS_PROMPT.length} jsonBodyBytes≈${approxBodyBytes}`,
    );
    this.logger.log(`[Gemini] 超时 | fetchTimeoutMs=${this.fetchTimeoutMs} (可用 GEMINI_FETCH_TIMEOUT_MS 覆盖)`);

    const t0 = Date.now();
    let response: Response;
    try {
      this.logger.debug(`[Gemini] fetch 开始 POST ${this.apiBase}${path}?key=***`);
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        signal: AbortSignal.timeout(this.fetchTimeoutMs),
      });
    } catch (err) {
      const elapsed = Date.now() - t0;
      const name = err instanceof Error ? err.name : 'Unknown';
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[Gemini] fetch 异常 | afterMs=${elapsed} name=${name} message=${msg}`,
      );
      if (name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout')) {
        this.logger.error(
          `[Gemini] 疑似超时：当前 GEMINI_FETCH_TIMEOUT_MS=${this.fetchTimeoutMs}，可在 .env 增大该值后重试`,
        );
      }
      throw new InternalServerErrorException(`Gemini 网络请求失败: ${msg}`);
    }

    const elapsedOk = Date.now() - t0;
    this.logger.log(`[Gemini] HTTP 响应 | status=${response.status} ok=${response.ok} afterMs=${elapsedOk}`);

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(
        `[Gemini] HTTP 错误体 (前4000字符): ${errText.slice(0, 4000)}${errText.length > 4000 ? '…(truncated)' : ''}`,
      );
      throw new InternalServerErrorException(`Gemini API 调用失败: ${response.status}`);
    }

    const rawJsonText = await response.text();
    this.logger.debug(`[Gemini] 响应体长度 rawJsonBytes=${Buffer.byteLength(rawJsonText, 'utf8')}`);

    let data: GeminiApiResponse;
    try {
      data = JSON.parse(rawJsonText) as GeminiApiResponse;
    } catch (e) {
      this.logger.error(
        `[Gemini] 响应不是合法 JSON | parseErr=${e instanceof Error ? e.message : e} head=${rawJsonText.slice(0, 800)}`,
      );
      throw new InternalServerErrorException('Gemini 返回非 JSON');
    }

    if (data?.error) {
      this.logger.error(`[Gemini] 业务错误 | ${JSON.stringify(data.error)}`);
      throw new InternalServerErrorException(
        `Gemini 错误: ${(data.error as { message?: string }).message ?? 'unknown'}`,
      );
    }

    const cand0 = data?.candidates?.[0];
    const finishReason = cand0?.finishReason;
    const partsLen = cand0?.content?.parts?.length ?? 0;
    this.logger.log(
      `[Gemini] 解析结构 | candidates=${data?.candidates?.length ?? 0} parts=${partsLen} finishReason=${finishReason ?? 'n/a'}`,
    );

    const rawText = cand0?.content?.parts?.[0]?.text ?? '';
    if (!rawText) {
      this.logger.error(
        `[Gemini] 无文本内容 | 完整响应摘要: ${JSON.stringify(data).slice(0, 2000)}`,
      );
      throw new InternalServerErrorException('Gemini 返回内容为空');
    }

    this.logger.debug(`[Gemini] 模型文本长度 textChars=${rawText.length}`);

    return this.parseJsonFromText(rawText);
  }

  // ─── 私有工具方法 ────────────────────────────────────────────────────────────

  /**
   * 从 LLM 返回的文本中提取 JSON
   * 兼容三种常见格式：纯 JSON、```json ... ```、包含前后噪声文本
   */
  private parseJsonFromText(text: string): GeminiParseResult {
    // 尝试去掉 markdown 代码块
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1].trim() : text.trim();

    // 提取第一个完整 JSON 对象
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1) {
      this.logger.error(`Cannot find JSON in Gemini response: ${candidate.slice(0, 200)}`);
      throw new InternalServerErrorException('AI 返回格式异常，无法提取 JSON');
    }

    const jsonStr = candidate.slice(start, end + 1);
    try {
      const parsed = JSON.parse(jsonStr) as GeminiParseResult;
      this.validateResult(parsed);
      return parsed;
    } catch (e) {
      this.logger.error(`JSON parse failed: ${e instanceof Error ? e.message : e}`);
      this.logger.debug(`Raw JSON string (first 500 chars): ${jsonStr.slice(0, 500)}`);
      throw new InternalServerErrorException('AI 返回 JSON 解析失败');
    }
  }

  /** 基础结构校验，防止字段缺失导致前端崩溃 */
  private validateResult(result: GeminiParseResult): void {
    if (typeof result.score !== 'number') throw new Error('Missing score');
    if (!result.parsedContent?.candidate) throw new Error('Missing parsedContent.candidate');
    if (!Array.isArray(result.interviewFocus)) throw new Error('Missing interviewFocus');
    if (!Array.isArray(result.dimensionScores)) throw new Error('Missing dimensionScores');
  }
}

// ─── Gemini API 响应类型 ───────────────────────────────────────────────────────
interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
  promptFeedback?: unknown;
}
