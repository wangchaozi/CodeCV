import client from './client'

// ─── 类型定义（与后端 Entity 对齐） ───────────────────────────────────────────

export type ResumeStatus = 'pending' | 'parsing' | 'done' | 'error'

export interface DimensionScore {
  label: string
  score: number
  color: string
}

export interface FocusTopic {
  label: string
  weight: 'high' | 'medium' | 'low'
  desc: string
}

export interface InterviewFocus {
  id: string
  title: string
  color: string
  topics: FocusTopic[]
}

export interface ParsedResumeContent {
  candidate: {
    name: string
    phone: string
    email: string
    location: string
    experience: string
  }
  summary: string
  experience: {
    id: number
    company: string
    role: string
    period: string
    bullets: string[]
  }[]
  skills: { category: string; items: string[] }[]
  projects: {
    id: number
    name: string
    period: string
    bullets: string[]
  }[]
  education: { school: string; degree: string; period: string }[]
}

export interface ResumeRecord {
  id: string
  userId: string
  originalName: string
  fileSize: number
  mimeType: string
  status: ResumeStatus
  score: number | null
  dimensionScores: DimensionScore[] | null
  parsedContent: ParsedResumeContent | null
  interviewFocus: InterviewFocus[] | null
  errorMessage: string | null
  createTime: string
  updateTime: string
}

export interface ResumeListResponse {
  items: ResumeRecord[]
  total: number
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const resumeApi = {
  /**
   * 上传简历文件（PDF / DOCX）
   * 上传后后端异步解析，初始状态为 parsing
   */
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<ResumeRecord>('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total))
        }
      },
    })
  },

  /** 获取当前用户的简历列表 */
  list: (params?: { status?: ResumeStatus; limit?: number; offset?: number }) =>
    client.get<ResumeListResponse>('/resume', { params }),

  /** 获取单份简历详情（含解析结果和面试侧重点） */
  getById: (id: string) =>
    client.get<ResumeRecord>(`/resume/${id}`),

  /** 手动重新触发 AI 解析 */
  reparse: (id: string) =>
    client.post<ResumeRecord>(`/resume/${id}/reparse`),

  /** 删除简历 */
  remove: (id: string) =>
    client.delete<void>(`/resume/${id}`),
}
