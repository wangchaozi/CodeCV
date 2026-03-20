import client from './client'
import type {
  KnowledgeSpace,
  CreateSpaceDto,
  UpdateSpaceDto,
  SpaceListResponse,
} from '../types/knowledge.types'

export const knowledgeSpaceApi = {
  /** GET /knowledge/spaces — 获取所有空间 */
  list: () =>
    client.get<SpaceListResponse>('/knowledge/spaces'),

  /** GET /knowledge/spaces/:id — 获取空间详情 */
  getById: (id: number) =>
    client.get<KnowledgeSpace>(`/knowledge/spaces/${id}`),

  /** POST /knowledge/spaces — 新建空间 */
  create: (data: CreateSpaceDto) =>
    client.post<KnowledgeSpace>('/knowledge/spaces', data),

  /** PATCH /knowledge/spaces/:id — 更新空间 */
  update: (id: number, data: UpdateSpaceDto) =>
    client.patch<KnowledgeSpace>(`/knowledge/spaces/${id}`, data),

  /** DELETE /knowledge/spaces/:id — 删除空间（含文章级联删除由后端处理） */
  delete: (id: number) =>
    client.delete<void>(`/knowledge/spaces/${id}`),
}
