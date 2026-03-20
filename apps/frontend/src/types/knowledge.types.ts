// ─── 知识库空间（一级） ────────────────────────────────────────────────────────

/** 知识库空间实体（对应后端 KnowledgeSpace entity） */
export interface KnowledgeSpace {
  id: number
  name: string
  description: string
  /** 封面色（hex） */
  coverColor: string
  /** 后端聚合的文章数量 */
  articleCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateSpaceDto {
  name: string
  description: string
  coverColor: string
}

export type UpdateSpaceDto = Partial<CreateSpaceDto>

export interface SpaceListResponse {
  items: KnowledgeSpace[]
  total: number
}

// ─── 文章（二级，归属某个空间） ───────────────────────────────────────────────
// 文章可以手动编写，也可以通过上传文件（PDF/MD/TXT/DOCX 等）解析后自动生成。
// 两种方式的产物完全一致，都是 KnowledgeArticle，均可点击查看。

/** 支持上传的文件格式 */
export type DocumentFormat = 'pdf' | 'md' | 'txt' | 'docx' | 'doc' | 'js' | 'ts' | 'vue'

/** 上传文章的处理状态（仅 source=upload 时有效） */
export type UploadStatus = 'uploading' | 'parsing' | 'parsed' | 'failed'

/** 知识库文章实体（对应后端 KnowledgeArticle entity） */
export interface KnowledgeArticle {
  /** 唯一 ID，后端自增主键 */
  id: number
  /** 所属空间 ID，外键 */
  spaceId: number
  /** 文章标题（上传文件时自动取文件名，解析后可修改） */
  title: string
  /** 文章正文（支持 Markdown；上传文件由后端提取文本后填充） */
  content: string
  /** 标签列表 */
  tags: string[]
  /** 在空间内的排序序号 */
  sortOrder: number
  createdAt: string
  updatedAt: string

  // ── 上传来源字段（可选，仅文件上传时存在）─────────────────────────────────
  /** 来源：手动编写 or 文件上传 */
  source?: 'manual' | 'upload'
  /** 原始文件名（source=upload 时存在） */
  originalFileName?: string
  /** 文件格式（source=upload 时存在） */
  fileFormat?: DocumentFormat
  /** 文件大小（字节，source=upload 时存在） */
  fileSize?: number
  /** 上传/解析状态（source=upload 时存在，parsed 后与普通文章完全等同） */
  uploadStatus?: UploadStatus
  /** 上传进度 0-100（uploadStatus=uploading 时有效） */
  uploadProgress?: number
}

/** POST /knowledge/articles 手动创建请求体 */
export interface CreateArticleDto {
  spaceId: number
  title: string
  content: string
  tags: string[]
}

/** PATCH /knowledge/articles/:id 更新请求体 */
export type UpdateArticleDto = Partial<Omit<CreateArticleDto, 'spaceId'>>

/** POST /knowledge/articles/upload 文件上传请求体（multipart/form-data） */
export interface UploadArticleDto {
  spaceId: number
  file: File
}

export interface ArticleListResponse {
  items: KnowledgeArticle[]
  total: number
}
