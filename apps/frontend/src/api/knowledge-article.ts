import client from './client'
import type {
  KnowledgeArticle,
  CreateArticleDto,
  UpdateArticleDto,
  ArticleListResponse,
} from '../types/knowledge.types'

export const knowledgeArticleApi = {
  /** GET /knowledge/spaces/:spaceId/articles — 获取某空间下的所有文章 */
  listBySpace: (spaceId: number) =>
    client.get<ArticleListResponse>(`/knowledge/spaces/${spaceId}/articles`),

  /** GET /knowledge/articles/:id — 获取文章详情 */
  getById: (id: number) =>
    client.get<KnowledgeArticle>(`/knowledge/articles/${id}`),

  /** POST /knowledge/articles — 创建文章 */
  create: (data: CreateArticleDto) =>
    client.post<KnowledgeArticle>('/knowledge/articles', data),

  /** PATCH /knowledge/articles/:id — 更新文章 */
  update: (id: number, data: UpdateArticleDto) =>
    client.patch<KnowledgeArticle>(`/knowledge/articles/${id}`, data),

  /** DELETE /knowledge/articles/:id — 删除文章 */
  delete: (id: number) =>
    client.delete<void>(`/knowledge/articles/${id}`),
}
