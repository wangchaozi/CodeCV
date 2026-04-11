import { create } from 'zustand'
import { knowledgeArticleApi } from '../api/knowledge-article'
import type {
  KnowledgeArticle,
  CreateArticleDto,
  UpdateArticleDto,
  DocumentFormat,
} from '../types/knowledge.types'

// ─── 文件上传工具（供 store 和 UI 组件复用）──────────────────────────────────

export const SUPPORTED_FORMATS = ['pdf', 'md', 'txt', 'docx', 'doc', 'js', 'ts', 'vue'] as const
export const ACCEPT_TYPES = '.pdf,.md,.txt,.docx,.doc,.js,.ts,.vue'
export const MAX_FILE_SIZE = 50 * 1024 * 1024   // 50 MB

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
    try {
      const { data } = await knowledgeArticleApi.listBySpace(spaceId)
      set((s) => ({
        articlesBySpace: { ...s.articlesBySpace, [spaceId]: data.items },
        loadingSpaceId: null,
      }))
    } catch {
      set({ loadingSpaceId: null, error: '加载文章失败' })
    }
  },

  createArticle: async (dto) => {
    const { data } = await knowledgeArticleApi.create(dto)
    set((s) => {
      const prev = s.articlesBySpace[dto.spaceId] ?? []
      return { articlesBySpace: { ...s.articlesBySpace, [dto.spaceId]: [...prev, data] } }
    })
    return data
  },

  updateArticle: async (id, dto) => {
    const { data } = await knowledgeArticleApi.update(id, dto)
    set((s) => {
      const updated: Record<number, KnowledgeArticle[]> = {}
      for (const [sid, articles] of Object.entries(s.articlesBySpace)) {
        updated[Number(sid)] = articles.map((a) => (a.id === id ? { ...a, ...data } : a))
      }
      return { articlesBySpace: updated }
    })
  },

  deleteArticle: async (spaceId, id) => {
    await knowledgeArticleApi.delete(id)
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).filter((a) => a.id !== id),
      },
    }))
  },

  deleteUploadedArticle: async (spaceId, id) => {
    await knowledgeArticleApi.delete(id)
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

    // 检查重名
    if (forceOverwrite) {
      const existing = (get().articlesBySpace[spaceId] ?? []).find(
        (a) => a.originalFileName === file.name,
      )
      if (existing) {
        await knowledgeArticleApi.delete(existing.id)
        set((s) => ({
          articlesBySpace: {
            ...s.articlesBySpace,
            [spaceId]: (s.articlesBySpace[spaceId] ?? []).filter((a) => a.id !== existing.id),
          },
        }))
      }
    }

    const tempId = -Date.now()
    const titleFromFile = file.name.replace(/\.[^.]+$/, '')

    // 占位文章，显示上传进度
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

    try {
      const { data: uploaded } = await knowledgeArticleApi.upload(spaceId, file, {
        onProgress: (pct) => {
          set((s) => ({
            articlesBySpace: {
              ...s.articlesBySpace,
              [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
                a.id === tempId ? { ...a, uploadProgress: pct, uploadStatus: 'uploading' as const } : a,
              ),
            },
          }))
        },
      })

      // 替换占位文章为真实文章
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === tempId ? uploaded : a,
          ),
        },
      }))
    } catch {
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === tempId ? { ...a, uploadStatus: 'failed' as const } : a,
          ),
        },
      }))
    }
  },

  retryUpload: async (spaceId, id, _file) => {
    set((s) => ({
      articlesBySpace: {
        ...s.articlesBySpace,
        [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
          a.id === id ? { ...a, uploadStatus: 'parsing' as const } : a,
        ),
      },
    }))
    try {
      const { data } = await knowledgeArticleApi.retryParsing(id)
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === id ? { ...a, ...data } : a,
          ),
        },
      }))
    } catch {
      set((s) => ({
        articlesBySpace: {
          ...s.articlesBySpace,
          [spaceId]: (s.articlesBySpace[spaceId] ?? []).map((a) =>
            a.id === id ? { ...a, uploadStatus: 'failed' as const } : a,
          ),
        },
      }))
    }
  },
}))
