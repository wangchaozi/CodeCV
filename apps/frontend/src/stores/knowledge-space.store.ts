import { create } from 'zustand'
import type { KnowledgeSpace, CreateSpaceDto, UpdateSpaceDto } from '../types/knowledge.types'

/** 空间封面预设色 */
export const SPACE_PRESET_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
]

let nextSpaceId = 10

// 开发阶段 mock 数据，后端就绪后移除（替换为 knowledgeSpaceApi 调用）
const MOCK_SPACES: KnowledgeSpace[] = [
  {
    id: 1,
    name: 'JavaScript 核心',
    description: '事件循环、原型链、闭包、this 绑定等 JS 基础知识',
    coverColor: '#f59e0b',
    articleCount: 3,
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'React 进阶',
    description: 'Hooks 原理、性能优化、状态管理最佳实践',
    coverColor: '#6366f1',
    articleCount: 2,
    createdAt: '2026-01-06T08:00:00.000Z',
    updatedAt: '2026-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'CSS & 布局',
    description: 'Flexbox、Grid、BFC、动画与视觉效果',
    coverColor: '#10b981',
    articleCount: 2,
    createdAt: '2026-01-07T08:00:00.000Z',
    updatedAt: '2026-01-14T08:00:00.000Z',
  },
  {
    id: 4,
    name: 'TypeScript 类型体操',
    description: '泛型约束、条件类型、工具类型、声明文件',
    coverColor: '#3b82f6',
    articleCount: 1,
    createdAt: '2026-01-08T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 5,
    name: '网络与浏览器',
    description: 'HTTP 协议、缓存策略、跨域、渲染流程',
    coverColor: '#ec4899',
    articleCount: 1,
    createdAt: '2026-01-09T08:00:00.000Z',
    updatedAt: '2026-01-13T08:00:00.000Z',
  },
  {
    id: 6,
    name: 'Node.js 全栈',
    description: '事件驱动、中间件、数据库集成、部署',
    coverColor: '#14b8a6',
    articleCount: 1,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-12T08:00:00.000Z',
  },
]

interface SpaceState {
  spaces: KnowledgeSpace[]
  loading: boolean
  error: string | null
}

interface SpaceActions {
  /** TODO: 替换为 `const { data } = await knowledgeSpaceApi.list()` */
  fetchSpaces: () => Promise<void>
  /** TODO: 替换为 `const { data } = await knowledgeSpaceApi.create(dto)` */
  createSpace: (dto: CreateSpaceDto) => Promise<void>
  /** TODO: 替换为 `const { data } = await knowledgeSpaceApi.update(id, dto)` */
  updateSpace: (id: number, dto: UpdateSpaceDto) => Promise<void>
  /** TODO: 替换为 `await knowledgeSpaceApi.delete(id)` */
  deleteSpace: (id: number) => Promise<void>
}

export const useKnowledgeSpaceStore = create<SpaceState & SpaceActions>((set) => ({
  spaces: [],
  loading: false,
  error: null,

  fetchSpaces: async () => {
    set({ loading: true, error: null })
    try {
      await new Promise<void>((r) => setTimeout(r, 300))
      set({ spaces: MOCK_SPACES, loading: false })
    } catch {
      set({ loading: false, error: '加载失败，请稍后重试' })
    }
  },

  createSpace: async (dto) => {
    const newSpace: KnowledgeSpace = {
      ...dto,
      id: nextSpaceId++,
      articleCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({ spaces: [...s.spaces, newSpace] }))
  },

  updateSpace: async (id, dto) => {
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id ? { ...sp, ...dto, updatedAt: new Date().toISOString() } : sp,
      ),
    }))
  },

  deleteSpace: async (id) => {
    set((s) => ({ spaces: s.spaces.filter((sp) => sp.id !== id) }))
  },
}))
