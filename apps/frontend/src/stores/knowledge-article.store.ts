import { create } from 'zustand'
import type {
  KnowledgeArticle,
  CreateArticleDto,
  UpdateArticleDto,
  DocumentFormat,
  UploadStatus,
} from '../types/knowledge.types'

// ─── 文件上传工具（供 store 和 UI 组件复用）──────────────────────────────────

export const SUPPORTED_FORMATS = ['pdf', 'md', 'txt', 'docx', 'doc', 'js', 'ts', 'vue'] as const
export const ACCEPT_TYPES = '.pdf,.md,.txt,.docx,.doc,.js,.ts,.vue'
export const MAX_FILE_SIZE = 50 * 1024 * 1024   // 50 MB
export const CHUNK_THRESHOLD = 10 * 1024 * 1024 // >10 MB 启用分片
export const CHUNK_SIZE = 2 * 1024 * 1024        // 每片 2 MB

export type FormatConfig = { label: string; color: string; bg: string }

export const FORMAT_CONFIG: Record<DocumentFormat, FormatConfig> = {
  pdf:  { label: 'PDF',  color: '#ef4444', bg: '#fef2f2' },
  md:   { label: 'MD',   color: '#3b82f6', bg: '#eff6ff' },
  txt:  { label: 'TXT',  color: '#6b7280', bg: '#f3f4f6' },
  docx: { label: 'DOCX', color: '#2563eb', bg: '#eff6ff' },
  doc:  { label: 'DOC',  color: '#1d4ed8', bg: '#eff6ff' },
  js:   { label: 'JS',   color: '#b45309', bg: '#fef3c7' },
  ts:   { label: 'TS',   color: '#3178c6', bg: '#dbeafe' },
  vue:  { label: 'Vue',  color: '#059669', bg: '#ecfdf5' },
}

export function getDocFormat(fileName: string): DocumentFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return (SUPPORTED_FORMATS as readonly string[]).includes(ext) ? (ext as DocumentFormat) : null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── Mock 初始文章数据 ────────────────────────────────────────────────────────

let nextArticleId = 100

const MOCK_ARTICLES: Record<number, KnowledgeArticle[]> = {
  1: [
    {
      id: 1, spaceId: 1, sortOrder: 1, source: 'manual',
      title: 'JavaScript 事件循环机制',
      tags: ['event-loop', '异步', '宏任务', '微任务'],
      content: `## 什么是事件循环？

JS 是单线程的，靠**事件循环**（Event Loop）实现异步非阻塞。

## 执行顺序

每轮事件循环的执行顺序：

1. 从调用栈（Call Stack）执行同步代码
2. 清空所有**微任务**队列（Promise.then、queueMicrotask、MutationObserver）
3. 执行一个**宏任务**（setTimeout、setInterval、I/O 回调）
4. 再次清空微任务队列
5. 浏览器渲染（如有需要）

## 示例

\`\`\`javascript
console.log('1')
setTimeout(() => console.log('2'), 0)
Promise.resolve().then(() => console.log('3'))
console.log('4')
// 输出：1 4 3 2
\`\`\``,
      createdAt: '2026-01-11T09:30:00.000Z', updatedAt: '2026-01-11T09:30:00.000Z',
    },
    {
      id: 2, spaceId: 1, sortOrder: 2, source: 'manual',
      title: 'JavaScript 原型链与继承',
      tags: ['原型链', '继承', 'OOP'],
      content: `## 原型链

每个对象都有一个 \`[[Prototype]]\` 内部槽，指向其原型对象。访问属性时，JS 引擎沿原型链向上查找直到 \`null\`。

## ES6 Class（语法糖）

\`\`\`javascript
class Dog extends Animal {
  speak() { return \`\${this.name} barks\` }
}
\`\`\`

原型链：\`dog → Dog.prototype → Animal.prototype → Object.prototype → null\``,
      createdAt: '2026-01-12T10:00:00.000Z', updatedAt: '2026-01-12T10:00:00.000Z',
    },
    {
      id: 3, spaceId: 1, sortOrder: 3, source: 'manual',
      title: '闭包与作用域',
      tags: ['闭包', '作用域', '函数'],
      content: `## 什么是闭包？

闭包是**函数与其词法环境的组合**。当内部函数引用了外部函数的变量时，即使外部函数已执行完毕，这些变量仍然存活在内存中。

## 经典闭包陷阱

\`\`\`javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // 全打印 3
}
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // 0 1 2
}
\`\`\``,
      createdAt: '2026-01-13T11:00:00.000Z', updatedAt: '2026-01-13T11:00:00.000Z',
    },
    // 模拟一篇已解析完成的上传文章
    {
      id: 4, spaceId: 1, sortOrder: 4, source: 'upload',
      title: 'JavaScript权威指南第7版',
      originalFileName: 'JavaScript权威指南第7版.pdf',
      fileFormat: 'pdf', fileSize: Math.round(8.2 * 1024 * 1024),
      uploadStatus: 'parsed', uploadProgress: 100,
      tags: ['参考书', 'JS基础'],
      content: `## JavaScript 权威指南（第 7 版）

> 本内容由上传的 PDF 文档解析生成，可作为 AI 问答的数据源。

### 第 1 章：JavaScript 简介

JavaScript 是一门高级、动态、解释型编程语言，非常适合面向对象和函数式编程风格...

### 第 3 章：类型、值和变量

JavaScript 的数据类型分为**原始类型**（primitive）和**对象类型**（object）。原始类型包括数字、字符串、布尔值、null、undefined、Symbol 和 BigInt...

### 第 8 章：函数

函数是 JavaScript 程序的基本构成单元，也是一段可以被调用执行的 JavaScript 代码...`,
      createdAt: '2026-01-10T10:00:00.000Z', updatedAt: '2026-01-10T10:00:00.000Z',
    },
  ],
  2: [
    {
      id: 5, spaceId: 2, sortOrder: 1, source: 'manual',
      title: 'React useEffect 依赖数组详解',
      tags: ['hooks', 'useEffect', '副作用'],
      content: `## 基本语法

\`\`\`typescript
useEffect(() => {
  // 副作用逻辑
  return () => { /* 清理函数 */ }
}, [dep1, dep2])
\`\`\`

## 三种模式

| 依赖数组 | 执行时机 |
|---------|---------|
| 省略 | 每次渲染后执行 |
| \`[]\` | 仅挂载时执行一次 |
| \`[a, b]\` | a 或 b 变化时执行 |`,
      createdAt: '2026-01-10T08:00:00.000Z', updatedAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 6, spaceId: 2, sortOrder: 2, source: 'manual',
      title: '前端性能优化：代码分割与懒加载',
      tags: ['性能优化', '懒加载', 'Vite'],
      content: `## React.lazy + Suspense

\`\`\`tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))
\`\`\`

## 实践建议

- 大型第三方库（recharts、pdf.js）应单独分割
- 首屏关键资源用 \`<link rel="preload">\` 预加载`,
      createdAt: '2026-01-15T15:00:00.000Z', updatedAt: '2026-01-15T15:00:00.000Z',
    },
  ],
  3: [
    {
      id: 7, spaceId: 3, sortOrder: 1, source: 'manual',
      title: 'CSS BFC（块级格式化上下文）',
      tags: ['BFC', '布局', '浮动'],
      content: `## 触发 BFC 的条件

- \`overflow\` 值不为 \`visible\`
- \`display: flex/grid/inline-block\`
- \`position: absolute/fixed\`

## 常见用途

清除浮动、防止 margin 合并、实现自适应两栏布局。`,
      createdAt: '2026-01-13T11:00:00.000Z', updatedAt: '2026-01-13T11:00:00.000Z',
    },
    {
      id: 8, spaceId: 3, sortOrder: 2, source: 'manual',
      title: 'Flexbox 核心概念速查',
      tags: ['Flexbox', '布局', 'CSS'],
      content: `## 容器属性

\`\`\`css
.container {
  display: flex;
  flex-direction: row | column;
  justify-content: flex-start | center | space-between;
  align-items: stretch | center | flex-end;
  gap: 16px;
}
\`\`\``,
      createdAt: '2026-01-14T10:00:00.000Z', updatedAt: '2026-01-14T10:00:00.000Z',
    },
  ],
  4: [
    {
      id: 9, spaceId: 4, sortOrder: 1, source: 'manual',
      title: 'TypeScript 泛型约束（extends keyof）',
      tags: ['泛型', '类型系统', '工具类型'],
      content: `## extends 约束

\`\`\`typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
\`\`\`

## 常用工具类型

\`\`\`typescript
type Partial<T>  = { [K in keyof T]?: T[K] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
\`\`\``,
      createdAt: '2026-01-14T14:00:00.000Z', updatedAt: '2026-01-14T14:00:00.000Z',
    },
  ],
  5: [
    {
      id: 10, spaceId: 5, sortOrder: 1, source: 'manual',
      title: 'HTTP/2 与 HTTP/1.1 的核心区别',
      tags: ['HTTP', 'HTTP/2', '网络协议'],
      content: `## HTTP/2 的改进

1. **多路复用**：单 TCP 连接并行传输
2. **首部压缩**（HPACK）：减少 50~90% Header 大小
3. **服务器推送**：主动推送客户端资源
4. **二进制分帧**：替代文本协议`,
      createdAt: '2026-01-12T10:00:00.000Z', updatedAt: '2026-01-12T10:00:00.000Z',
    },
  ],
  6: [
    {
      id: 11, spaceId: 6, sortOrder: 1, source: 'manual',
      title: 'Node.js 事件驱动与非阻塞 I/O',
      tags: ['Node.js', '事件循环', 'libuv'],
      content: `## 核心特性

Node.js 基于 **libuv** 实现跨平台的异步 I/O，单线程 + 事件循环处理并发。

## 适用场景

✅ I/O 密集型（API 网关、实时通信）
❌ CPU 密集型（图像处理 → 考虑 Worker Threads）`,
      createdAt: '2026-01-17T11:00:00.000Z', updatedAt: '2026-01-17T11:00:00.000Z',
    },
  ],
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ArticleState {
  articlesBySpace: Record<number, KnowledgeArticle[]>
  loadingSpaceId: number | null
  error: string | null
}

interface ArticleActions {
  fetchBySpace: (spaceId: number) => Promise<void>
  createArticle: (dto: CreateArticleDto) => Promise<KnowledgeArticle>
  updateArticle: (id: number, dto: UpdateArticleDto) => Promise<void>
  deleteArticle: (spaceId: number, id: number) => Promise<void>
  /**
   * 上传文件并自动解析为文章
   * - 大文件（>CHUNK_THRESHOLD）分片上传，实时更新进度
   * - 上传完成后进入"解析中"阶段，解析完成后成为普通文章
   * - forceOverwrite=true：删除同名旧文章后重新上传
   * TODO: 后端就绪后替换为 knowledgeArticleApi.upload()
   */
  uploadArticle: (spaceId: number, file: File, forceOverwrite?: boolean) => Promise<void>
  retryUpload: (spaceId: number, id: number, file: File) => Promise<void>
  deleteUploadedArticle: (spaceId: number, id: number) => Promise<void>
}

export const useKnowledgeArticleStore = create<ArticleState & ArticleActions>((set, get) => ({
  articlesBySpace: {},
  loadingSpaceId: null,
  error: null,

  fetchBySpace: async (spaceId) => {
    set({ loadingSpaceId: spaceId, error: null })
    await new Promise<void>((r) => setTimeout(r, 200))
    set((s) => ({
      articlesBySpace: { ...s.articlesBySpace, [spaceId]: MOCK_ARTICLES[spaceId] ?? [] },
      loadingSpaceId: null,
    }))
  },

  createArticle: async (dto) => {
    const newArticle: KnowledgeArticle = {
      ...dto,
      source: 'manual',
      id: nextArticleId++,
      sortOrder: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => {
      const prev = s.articlesBySpace[dto.spaceId] ?? []
      return { articlesBySpace: { ...s.articlesBySpace, [dto.spaceId]: [...prev, newArticle] } }
    })
    return newArticle
  },

  updateArticle: async (id, dto) => {
    set((s) => {
      const updated: Record<number, KnowledgeArticle[]> = {}
      for (const [sid, articles] of Object.entries(s.articlesBySpace)) {
        updated[Number(sid)] = articles.map((a) =>
          a.id === id ? { ...a, ...dto, updatedAt: new Date().toISOString() } : a,
        )
      }
      return { articlesBySpace: updated }
    })
  },

  deleteArticle: async (spaceId, id) => {
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).filter((a) => a.id !== id),
      },
    }))
  },

  deleteUploadedArticle: async (spaceId, id) => {
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).filter((a) => a.id !== id),
      },
    }))
  },

  uploadArticle: async (spaceId, file, forceOverwrite = false) => {
    const format = getDocFormat(file.name)
    if (!format) return

    if (forceOverwrite) {
      const existing = (get().articlesBySpace[spaceId] ?? []).find(
        (a) => a.originalFileName === file.name,
      )
      if (existing) {
        set((s) => ({
          articlesBySpace: {
            ...s.articlesBySpace,
            [spaceId]: (s.articlesBySpace[spaceId] ?? []).filter((a) => a.id !== existing.id),
          },
        }))
      }
    }

    const tempId = nextArticleId++
    const titleFromFile = file.name.replace(/\.[^.]+$/, '')

    // 创建占位文章（uploading 状态）
    const placeholder: KnowledgeArticle = {
      id: tempId,
      spaceId,
      title: titleFromFile,
      content: '',
      tags: [],
      sortOrder: Date.now(),
      source: 'upload',
      originalFileName: file.name,
      fileFormat: format,
      fileSize: file.size,
      uploadStatus: 'uploading',
      uploadProgress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: [...(s.articlesBySpace[spaceId] ?? []), placeholder],
      },
    }))

    const updateProgress = (progress: number, status?: UploadStatus) => {
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === tempId
              ? { ...a, uploadProgress: progress, ...(status ? { uploadStatus: status } : {}) }
              : a,
          ),
        },
      }))
    }

    // ── 分片上传仿真 ──────────────────────────────────────────────────────────
    const isLargeFile = file.size > CHUNK_THRESHOLD
    const totalChunks = isLargeFile ? Math.ceil(file.size / CHUNK_SIZE) : 1
    const delayPerChunk = isLargeFile ? 120 : 400

    for (let i = 0; i < totalChunks; i++) {
      await new Promise<void>((r) => setTimeout(r, delayPerChunk))
      updateProgress(Math.round(((i + 1) / totalChunks) * 100))
    }

    // ── 解析阶段 ──────────────────────────────────────────────────────────────
    updateProgress(100, 'parsing')
    await new Promise<void>((r) => setTimeout(r, 1200 + Math.random() * 1500))

    const success = Math.random() > 0.15

    if (success) {
      const extractedContent = buildExtractedContent(titleFromFile, file.name, file.size, format)
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === tempId
              ? {
                  ...a,
                  uploadStatus: 'parsed',
                  content: extractedContent,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
        },
      }))
    } else {
      updateProgress(100, 'failed')
    }
  },

  retryUpload: async (spaceId, id, file) => {
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
          a.id === id ? { ...a, uploadStatus: 'parsing', uploadProgress: 100 } : a,
        ),
      },
    }))
    await new Promise<void>((r) => setTimeout(r, 1500 + Math.random() * 1000))
    const extractedContent = buildExtractedContent(
      file.name.replace(/\.[^.]+$/, ''),
      file.name,
      file.size,
      getDocFormat(file.name) ?? 'txt',
    )
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
          a.id === id
            ? { ...a, uploadStatus: 'parsed', content: extractedContent, updatedAt: new Date().toISOString() }
            : a,
        ),
      },
    }))
  },
}))

// ─── 辅助：生成解析后的文章内容（mock） ──────────────────────────────────────

function buildExtractedContent(
  title: string,
  fileName: string,
  size: number,
  format: DocumentFormat,
): string {
  return `## ${title}

> 本文由上传的 **${FORMAT_CONFIG[format].label}** 文件 \`${fileName}\`（${formatFileSize(size)}）解析生成，可作为 AI 问答的知识来源。

---

### 文档内容摘要

（此处为后端从文件中提取的文本内容，经过分块处理后已生成向量索引，可供 AI 检索问答使用。）

在实际接入后端后，本内容将替换为从原始文件解析出的真实文本。

### 使用说明

- 文档已完成向量化，可在"问答助手"中直接提问
- 支持对文档内容进行编辑和补充
- 可添加标签便于分类检索`
}
