import client from './client'
import type {
  KnowledgeArticle,
  CreateArticleDto,
  UpdateArticleDto,
  ArticleListResponse,
} from '../types/knowledge.types'

export const knowledgeArticleApi = {
  /** GET /knowledge/spaces/:spaceId/articles — 获取某空间下的所有文章（含上传来源）*/
  listBySpace: (spaceId: number) =>
    client.get<ArticleListResponse>(`/knowledge/spaces/${spaceId}/articles`),

  /** GET /knowledge/articles/:id — 获取文章详情 */
  getById: (id: number) =>
    client.get<KnowledgeArticle>(`/knowledge/articles/${id}`),

  /** POST /knowledge/articles — 手动创建文章 */
  create: (data: CreateArticleDto) =>
    client.post<KnowledgeArticle>('/knowledge/articles', data),

  /** PATCH /knowledge/articles/:id — 更新文章（标题、内容、标签） */
  update: (id: number, data: UpdateArticleDto) =>
    client.patch<KnowledgeArticle>(`/knowledge/articles/${id}`, data),

  /** DELETE /knowledge/articles/:id — 删除文章 */
  delete: (id: number) =>
    client.delete<void>(`/knowledge/articles/${id}`),

  /**
   * POST /knowledge/articles/upload — 上传文件并自动解析为文章（multipart/form-data）
   * 后端负责文本提取、分块向量化，完成后以 source=upload 的形式返回文章实体。
   * 大文件调用方可分片上传，每片携带 chunkIndex / totalChunks 字段。
   * TODO: 前端 store 目前使用 mock 模拟，后端就绪后替换 uploadArticle action。
   */
  upload: (
    spaceId: number,
    file: File,
    options?: {
      chunkIndex?: number
      totalChunks?: number
      onProgress?: (pct: number) => void
    },
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('spaceId', String(spaceId))
    if (options?.chunkIndex !== undefined) formData.append('chunkIndex', String(options.chunkIndex))
    if (options?.totalChunks !== undefined) formData.append('totalChunks', String(options.totalChunks))

    return client.post<KnowledgeArticle>('/knowledge/articles/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) options?.onProgress?.(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  /** POST /knowledge/articles/:id/retry — 重新触发解析（上传来源文章解析失败后） */
  retryParsing: (id: number) =>
    client.post<KnowledgeArticle>(`/knowledge/articles/${id}/retry`),
}
