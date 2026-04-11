import { create } from 'zustand'
import { knowledgeSpaceApi } from '../api/knowledge-space'
import type { KnowledgeSpace, CreateSpaceDto, UpdateSpaceDto } from '../types/knowledge.types'

export const SPACE_PRESET_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
]

interface SpaceState {
  spaces: KnowledgeSpace[]
  loading: boolean
  error: string | null
}

interface SpaceActions {
  fetchSpaces: () => Promise<void>
  createSpace: (dto: CreateSpaceDto) => Promise<void>
  updateSpace: (id: number, dto: UpdateSpaceDto) => Promise<void>
  deleteSpace: (id: number) => Promise<void>
}

export const useKnowledgeSpaceStore = create<SpaceState & SpaceActions>((set) => ({
  spaces: [],
  loading: false,
  error: null,

  fetchSpaces: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await knowledgeSpaceApi.list()
      set({ spaces: data.items, loading: false })
    } catch {
      set({ loading: false, error: '加载失败，请稍后重试' })
    }
  },

  createSpace: async (dto) => {
    const { data } = await knowledgeSpaceApi.create(dto)
    const newSpace: KnowledgeSpace = { ...data, articleCount: 0 }
    set((s) => ({ spaces: [...s.spaces, newSpace] }))
  },

  updateSpace: async (id, dto) => {
    const { data } = await knowledgeSpaceApi.update(id, dto)
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id ? { ...sp, ...data, articleCount: sp.articleCount } : sp,
      ),
    }))
  },

  deleteSpace: async (id) => {
    await knowledgeSpaceApi.delete(id)
    set((s) => ({ spaces: s.spaces.filter((sp) => sp.id !== id) }))
  },
}))
