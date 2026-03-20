import { create } from 'zustand'
import type { KnowledgeArticle, CreateArticleDto, UpdateArticleDto } from '../types/knowledge.types'

let nextArticleId = 100

// 开发阶段 mock 数据，按 spaceId 分组，后端就绪后移除
const MOCK_ARTICLES: Record<number, KnowledgeArticle[]> = {
  1: [
    {
      id: 1, spaceId: 1, sortOrder: 1,
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
      id: 2, spaceId: 1, sortOrder: 2,
      title: 'JavaScript 原型链与继承',
      tags: ['原型链', '继承', 'OOP'],
      content: `## 原型链

每个对象都有一个 \`[[Prototype]]\` 内部槽，指向其原型对象。访问属性时，JS 引擎沿原型链向上查找直到 \`null\`。

## 构造函数与 prototype

\`\`\`javascript
function Animal(name) {
  this.name = name
}
Animal.prototype.speak = function () {
  return \`\${this.name} makes a sound\`
}
\`\`\`

## ES6 Class（语法糖）

\`\`\`javascript
class Dog extends Animal {
  speak() {
    return \`\${this.name} barks\`
  }
}
\`\`\`

原型链：\`dog → Dog.prototype → Animal.prototype → Object.prototype → null\``,
      createdAt: '2026-01-12T10:00:00.000Z', updatedAt: '2026-01-12T10:00:00.000Z',
    },
    {
      id: 3, spaceId: 1, sortOrder: 3,
      title: '闭包与作用域',
      tags: ['闭包', '作用域', '函数'],
      content: `## 什么是闭包？

闭包是**函数与其词法环境的组合**。当内部函数引用了外部函数的变量时，即使外部函数已执行完毕，这些变量仍然存活在内存中。

## 经典用途

- **数据私有化**（模块模式）
- **函数柯里化**
- **事件监听器与回调**

## 经典闭包陷阱

\`\`\`javascript
// 循环中使用 var（陷阱）
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // 全打印 3
}

// 修复：用 let 或 IIFE
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100) // 0 1 2
}
\`\`\``,
      createdAt: '2026-01-13T11:00:00.000Z', updatedAt: '2026-01-13T11:00:00.000Z',
    },
  ],
  2: [
    {
      id: 4, spaceId: 2, sortOrder: 1,
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
| \`[a, b]\` | a 或 b 变化时执行 |

## 常见陷阱

1. **遗漏依赖**：eslint-plugin-react-hooks 会发出警告
2. **对象/数组作为依赖**：每次渲染引用变化，导致无限循环
3. **在 effect 内部定义函数**：用 useCallback 包裹后加入依赖`,
      createdAt: '2026-01-10T08:00:00.000Z', updatedAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 5, spaceId: 2, sortOrder: 2,
      title: '前端性能优化：代码分割与懒加载',
      tags: ['性能优化', '懒加载', 'Vite', 'code-splitting'],
      content: `## 为什么需要代码分割？

单页应用如果将所有代码打包在一个 bundle 中，首屏加载时间会随应用体积增大而增加。

## React.lazy + Suspense

\`\`\`tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
\`\`\`

## 路由级代码分割

Vite + React Router 推荐在路由层面进行分割，每个页面生成独立 chunk。

## 实践建议

- 大型第三方库（recharts、pdf.js）应单独分割
- 首屏关键资源用 \`<link rel="preload">\` 预加载
- 分析 bundle：使用 rollup-plugin-visualizer`,
      createdAt: '2026-01-15T15:00:00.000Z', updatedAt: '2026-01-15T15:00:00.000Z',
    },
  ],
  3: [
    {
      id: 6, spaceId: 3, sortOrder: 1,
      title: 'CSS BFC（块级格式化上下文）',
      tags: ['BFC', '布局', '浮动', '清除浮动'],
      content: `## 什么是 BFC？

BFC（Block Formatting Context）是 CSS 中一个独立的渲染区域，内部元素的布局不会影响外部。

## 触发 BFC 的条件

- \`overflow\` 值不为 \`visible\`（如 \`auto\`、\`hidden\`）
- \`display: flex\`、\`grid\`、\`inline-block\`、\`table-cell\`
- \`position: absolute\` 或 \`fixed\`
- \`float\` 不为 \`none\`

## 常见用途

### 1. 清除浮动

\`\`\`css
.parent { overflow: hidden; } /* 触发 BFC，包含浮动子元素 */
\`\`\`

### 2. 防止 margin 合并

相邻块级元素的 margin 会合并，将其放入不同 BFC 可阻止合并。

### 3. 实现自适应两栏布局

\`\`\`css
.aside { float: left; width: 200px; }
.main  { overflow: hidden; } /* BFC 不与浮动重叠 */
\`\`\``,
      createdAt: '2026-01-13T11:00:00.000Z', updatedAt: '2026-01-13T11:00:00.000Z',
    },
    {
      id: 7, spaceId: 3, sortOrder: 2,
      title: 'Flexbox 核心概念速查',
      tags: ['Flexbox', '布局', 'CSS'],
      content: `## 容器属性

\`\`\`css
.container {
  display: flex;
  flex-direction: row | column;
  justify-content: flex-start | center | space-between;
  align-items: stretch | center | flex-end;
  flex-wrap: nowrap | wrap;
  gap: 16px;
}
\`\`\`

## 子项属性

\`\`\`css
.item {
  flex: 1;           /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex-shrink: 0;    /* 禁止收缩 */
  align-self: center;
  order: -1;
}
\`\`\`

## 常用技巧

- 垂直水平居中：\`display: flex; align-items: center; justify-content: center\`
- 等分子项：给每个子项设置 \`flex: 1\`
- 最后一项靠右：\`margin-left: auto\``,
      createdAt: '2026-01-14T10:00:00.000Z', updatedAt: '2026-01-14T10:00:00.000Z',
    },
  ],
  4: [
    {
      id: 8, spaceId: 4, sortOrder: 1,
      title: 'TypeScript 泛型约束（extends keyof）',
      tags: ['泛型', '类型系统', '工具类型', '条件类型'],
      content: `## 基本泛型

\`\`\`typescript
function identity<T>(value: T): T {
  return value
}
\`\`\`

## extends 约束

\`\`\`typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
\`\`\`

## 常用工具类型

\`\`\`typescript
type Partial<T>  = { [K in keyof T]?: T[K] }
type Required<T> = { [K in keyof T]-?: T[K] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
\`\`\`

## 条件类型

\`\`\`typescript
type NonNullable<T> = T extends null | undefined ? never : T
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never
\`\`\``,
      createdAt: '2026-01-14T14:00:00.000Z', updatedAt: '2026-01-14T14:00:00.000Z',
    },
  ],
  5: [
    {
      id: 9, spaceId: 5, sortOrder: 1,
      title: 'HTTP/2 与 HTTP/1.1 的核心区别',
      tags: ['HTTP', 'HTTP/2', '网络协议', '性能'],
      content: `## 背景

HTTP/1.1 的主要痛点：

- **队头阻塞**：同一连接上的请求必须串行等待
- **Header 冗余**：每次请求携带大量重复头字段
- **没有优先级机制**

## HTTP/2 的改进

### 1. 多路复用

单个 TCP 连接上可以并行传输多个请求/响应，彻底解决队头阻塞。

### 2. 首部压缩（HPACK）

使用静态表 + 动态表压缩 Header，减少 50~90% 的头字段大小。

### 3. 服务器推送

服务器可以主动推送客户端可能需要的资源（如 CSS、JS）。

### 4. 二进制分帧

用二进制替代文本协议，解析更高效，帧类型明确。

## HTTP/3（QUIC）

基于 UDP，解决了 TCP 层的队头阻塞，进一步提升弱网性能。`,
      createdAt: '2026-01-12T10:00:00.000Z', updatedAt: '2026-01-12T10:00:00.000Z',
    },
  ],
  6: [
    {
      id: 10, spaceId: 6, sortOrder: 1,
      title: 'Node.js 事件驱动与非阻塞 I/O',
      tags: ['Node.js', '事件循环', '非阻塞I/O', 'libuv'],
      content: `## 核心特性

Node.js 基于 **libuv** 实现跨平台的异步 I/O，单线程 + 事件循环处理并发。

## 事件循环阶段

\`\`\`
┌───────────────────────────┐
│           timers          │ ← setTimeout, setInterval
├───────────────────────────┤
│     pending callbacks     │ ← 上一轮延迟的 I/O 回调
├───────────────────────────┤
│          poll             │ ← 等待新的 I/O 事件
├───────────────────────────┤
│           check           │ ← setImmediate
├───────────────────────────┤
│      close callbacks      │
└───────────────────────────┘
\`\`\`

## 线程池

CPU 密集型任务（crypto、zlib、fs 大文件）在 libuv 的**线程池**（默认 4 个线程）中执行，不阻塞事件循环。

## 适用场景

✅ I/O 密集型（API 网关、实时通信）
❌ CPU 密集型（图像处理、科学计算 → 考虑 Worker Threads）`,
      createdAt: '2026-01-17T11:00:00.000Z', updatedAt: '2026-01-17T11:00:00.000Z',
    },
  ],
}

interface ArticleState {
  articlesBySpace: Record<number, KnowledgeArticle[]>
  loadingSpaceId: number | null
  error: string | null
}

interface ArticleActions {
  /** TODO: 替换为 `const { data } = await knowledgeArticleApi.listBySpace(spaceId)` */
  fetchBySpace: (spaceId: number) => Promise<void>
  /** TODO: 替换为 `const { data } = await knowledgeArticleApi.create(dto)` */
  createArticle: (dto: CreateArticleDto) => Promise<void>
  /** TODO: 替换为 `const { data } = await knowledgeArticleApi.update(id, dto)` */
  updateArticle: (id: number, dto: UpdateArticleDto) => Promise<void>
  /** TODO: 替换为 `await knowledgeArticleApi.delete(id)` */
  deleteArticle: (spaceId: number, id: number) => Promise<void>
}

export const useKnowledgeArticleStore = create<ArticleState & ArticleActions>((set) => ({
  articlesBySpace: {},
  loadingSpaceId: null,
  error: null,

  fetchBySpace: async (spaceId) => {
    set({ loadingSpaceId: spaceId, error: null })
    try {
      await new Promise<void>((r) => setTimeout(r, 200))
      const items = MOCK_ARTICLES[spaceId] ?? []
      set((s) => ({
        articlesBySpace: { ...s.articlesBySpace, [spaceId]: items },
        loadingSpaceId: null,
      }))
    } catch {
      set({ loadingSpaceId: null, error: '加载文章失败' })
    }
  },

  createArticle: async (dto) => {
    const newArticle: KnowledgeArticle = {
      ...dto,
      id: nextArticleId++,
      sortOrder: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => {
      const prev = s.articlesBySpace[dto.spaceId] ?? []
      return {
        articlesBySpace: {
          ...s.articlesBySpace,
          [dto.spaceId]: [...prev, newArticle],
        },
      }
    })
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
}))
