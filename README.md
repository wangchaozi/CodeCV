# CodeCV — 智能简历分析平台

基于 AI 的一站式求职辅助平台，涵盖简历解析与评分、AI 模拟面试、知识库管理和 RAG 问答助手。

## 功能特性

- **简历管理**：上传 PDF 简历，由 Gemini 大模型自动解析结构化信息并给出综合评分
- **AI 模拟面试**：根据简历内容生成针对性面试题，支持多轮对话与答题记录
- **知识库**：创建知识空间，上传文章/文档（PDF、DOCX、TXT、Markdown、代码文件），自动分块建立向量索引
- **RAG 问答助手**：基于知识库内容进行检索增强生成（RAG）对话，优先向量检索，降级至全文检索
- **用户系统**：注册/登录、JWT 鉴权、个人资料管理

## 技术栈

**前端**

| 技术 | 说明 |
|------|------|
| React 19 + TypeScript | 核心框架 |
| Vite | 构建工具 |
| Ant Design 6 | UI 组件库 |
| Zustand | 状态管理 |
| React Router 7 | 客户端路由 |
| Framer Motion | 动画 |
| Recharts | 数据图表 |

**后端**

| 技术 | 说明 |
|------|------|
| NestJS 11 + TypeScript | 服务端框架 |
| PostgreSQL + TypeORM | 数据存储 |
| Passport + JWT | 认证授权 |
| Gemini API | 简历解析、模拟面试、RAG 对话 |
| OpenAI Embeddings API | 文本向量化（`text-embedding-ada-002`） |
| pdf-parse + mammoth | PDF / DOCX 文本提取 |
| Multer | 文件上传 |
| Swagger | API 文档 |

**Monorepo**

pnpm workspaces，包含 `apps/frontend` 和 `apps/backend` 两个子包。

## 快速开始

### 前置条件

- Node.js >= 20
- pnpm >= 10
- PostgreSQL >= 14

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制后端环境变量模板并按实际情况填写：

```bash
cp apps/backend/.env.example apps/backend/.env
```

| 变量 | 说明 | 示例 |
|------|------|------|
| `PORT` | 后端监听端口 | `3000` |
| `DB_HOST` | PostgreSQL 主机 | `127.0.0.1` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_USERNAME` | 数据库用户名 | `root` |
| `DB_PASSWORD` | 数据库密码 | `123456` |
| `DB_DATABASE` | 数据库名 | `ai_resume_platform` |
| `DB_SYNC` | 自动同步表结构（开发用） | `true` |
| `JWT_SECRET` | JWT 签名密钥（生产环境请替换） | 随机字符串 |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `UPLOAD_DIR` | 简历文件存储目录 | `uploads/resumes` |
| `GEMINI_API_KEY` | Gemini / 中转站 API Key | `sk-xxx` |
| `GEMINI_API_BASE` | API 基础地址 | `https://api.vectorengine.ai` |
| `GEMINI_MODEL` | 对话模型名称 | `gemini-3.1-pro-preview` |
| `GEMINI_FETCH_TIMEOUT_MS` | 请求超时毫秒数（可选） | `300000` |

### 启动开发服务

```bash
# 同时启动前端（:5173）和后端（:3000）
pnpm dev

# 单独启动
pnpm dev:frontend
pnpm dev:backend
```

### 构建生产包

```bash
pnpm build
```

## 项目结构

```
CodeCV/
├── apps/
│   ├── frontend/               # React 前端
│   │   └── src/
│   │       ├── api/            # HTTP 请求封装
│   │       ├── pages/          # 页面组件
│   │       │   ├── auth/       # 登录 / 注册
│   │       │   ├── dashboard/  # 主控台（简历、面试记录）
│   │       │   ├── knowledge/  # 知识库管理
│   │       │   ├── interview/  # 模拟面试
│   │       │   └── assistant/  # RAG 问答助手
│   │       ├── stores/         # Zustand 状态
│   │       └── router/         # 路由配置
│   └── backend/                # NestJS 后端
│       └── src/
│           ├── auth/           # JWT 认证
│           ├── user/           # 用户管理
│           ├── resume/         # 简历上传与 Gemini 解析
│           ├── interview/      # 面试会话与题目
│           ├── knowledge/      # 知识库 + RAG 服务
│           │   ├── entities/   # 数据库实体
│           │   ├── dto/        # 请求 DTO
│           │   ├── knowledge.service.ts
│           │   └── rag.service.ts
│           └── common/         # 全局过滤器、拦截器
├── package.json                # Monorepo 根配置
└── pnpm-workspace.yaml
```

## API 文档

后端启动后访问 `http://localhost:3000/api-docs` 查看 Swagger 交互式文档。

## RAG 问答架构

```
用户提问
  │
  ▼
embedText(question)          ← OpenAI /v1/embeddings
  │ 成功                失败
  ▼                      ▼
向量检索（余弦相似度）   关键词检索（ILIKE）
  │ 无向量块              │
  └──────────────────────┘
          │
          ▼
    检索到相关 chunks
          │
          ▼
  systemInstruction 注入上下文
          │
          ▼
  Gemini streamGenerateContent  ← SSE 流式输出
          │
          ▼
      前端逐 token 渲染
```

向量块缺失时可调用重建接口补充索引：

```bash
POST /api/knowledge/spaces/:spaceId/reindex
Authorization: Bearer <token>
```

## 主要路由

| 路径 | 说明 |
|------|------|
| `GET  /api/knowledge/spaces` | 列出知识空间 |
| `POST /api/knowledge/spaces` | 创建知识空间 |
| `POST /api/knowledge/spaces/:id/articles` | 创建文章 |
| `POST /api/knowledge/articles/upload` | 上传文件并解析 |
| `POST /api/knowledge/spaces/:id/chat` | RAG 流式问答（SSE） |
| `POST /api/knowledge/spaces/:id/reindex` | 重建向量索引 |
| `POST /api/resume/upload` | 上传简历 |
| `POST /api/interview/sessions` | 发起面试会话 |
| `POST /api/auth/login` | 登录 |
| `POST /api/auth/register` | 注册 |
