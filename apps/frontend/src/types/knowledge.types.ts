// ─── 知识库空间（一级） ────────────────────────────────────────────────────────

/** 知识库空间实体（对应后端 KnowledgeSpace entity） */
export interface KnowledgeSpace {
  /** 唯一 ID，后端自增主键 */
  id: number
  /** 空间名称 */
  name: string
  /** 空间描述 */
  description: string
  /** 封面色（hex，用于卡片视觉区分） */
  coverColor: string
  /** 空间内文章数量（后端聚合字段） */
  articleCount: number
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 更新时间（ISO 8601） */
  updatedAt: string
}

/** POST /knowledge/spaces 请求体 */
export interface CreateSpaceDto {
  name: string
  description: string
  coverColor: string
}

/** PATCH /knowledge/spaces/:id 请求体 */
export type UpdateSpaceDto = Partial<CreateSpaceDto>

/** 空间列表响应 */
export interface SpaceListResponse {
  items: KnowledgeSpace[]
  total: number
}

// ─── 文章（二级，归属某个空间） ───────────────────────────────────────────────

/** 知识库文章实体（对应后端 KnowledgeArticle entity） */
export interface KnowledgeArticle {
  /** 唯一 ID，后端自增主键 */
  id: number
  /** 所属空间 ID，外键 */
  spaceId: number
  /** 文章标题 */
  title: string
  /** 文章正文（支持 Markdown） */
  content: string
  /** 标签列表 */
  tags: string[]
  /** 在空间内的排序序号 */
  sortOrder: number
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 更新时间（ISO 8601） */
  updatedAt: string
}

/** POST /knowledge/articles 请求体 */
export interface CreateArticleDto {
  spaceId: number
  title: string
  content: string
  tags: string[]
}

/** PATCH /knowledge/articles/:id 请求体 */
export type UpdateArticleDto = Partial<Omit<CreateArticleDto, 'spaceId'>>

/** 文章列表响应 */
export interface ArticleListResponse {
  items: KnowledgeArticle[]
  total: number
}
