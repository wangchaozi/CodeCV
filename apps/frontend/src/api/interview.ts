import client from './client'

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'open_ended'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type SessionStatus = 'in_progress' | 'completed'

export interface InterviewQuestion {
  id: string
  resumeId: string
  type: QuestionType
  content: string
  options: string[] | null
  correctAnswer: string | null
  explanation: string | null
  category: string
  difficulty: QuestionDifficulty
  sortOrder: number
  createTime: string
}

export interface InterviewAnswer {
  id: string
  sessionId: string
  questionId: string
  userAnswer: string
  isCorrect: boolean | null
  createTime: string
}

export interface InterviewSession {
  id: string
  userId: string
  resumeId: string
  status: SessionStatus
  totalQuestions: number
  correctCount: number | null
  score: number | null
  startTime: string
  endTime: string | null
  durationSecs: number | null
  updateTime: string
  resume?: {
    id: string
    originalName: string
    score: number | null
  }
  answers?: InterviewAnswer[]
}

export interface StartSessionResponse {
  session: InterviewSession
  questions: InterviewQuestion[]
}

export interface SessionDetailResponse {
  session: InterviewSession
  questions: InterviewQuestion[]
  answers: InterviewAnswer[]
}

export interface SessionListResponse {
  items: InterviewSession[]
  total: number
}

export interface AnswerItem {
  questionId: string
  userAnswer: string
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const interviewApi = {
  /** 获取或自动生成简历对应题目 */
  getQuestions: (resumeId: string) =>
    client.get<{ questions: InterviewQuestion[] }>(`/interview/questions/${resumeId}`),

  /** 重新生成题目 */
  regenerateQuestions: (resumeId: string) =>
    client.post<{ questions: InterviewQuestion[] }>(`/interview/questions/${resumeId}/regenerate`),

  /** 开始面试会话（自动生成题目 + 创建会话） */
  startSession: (resumeId: string) =>
    client.post<StartSessionResponse>(`/interview/session/start/${resumeId}`),

  /** 提交答卷（durationSecs 为前端实际答题秒数，用于避免时区计算偏差） */
  submitSession: (sessionId: string, answers: AnswerItem[], durationSecs?: number) =>
    client.post<InterviewSession>(`/interview/session/${sessionId}/submit`, { answers, durationSecs }),

  /** 获取面试记录列表 */
  getSessions: (params?: { limit?: number; offset?: number }) =>
    client.get<SessionListResponse>('/interview/sessions', { params }),

  /** 获取面试会话详情（含题目 + 答案） */
  getSessionDetail: (sessionId: string) =>
    client.get<SessionDetailResponse>(`/interview/session/${sessionId}`),

  /** 删除单条面试记录 */
  deleteSession: (sessionId: string) =>
    client.delete<void>(`/interview/session/${sessionId}`),

  /** 批量删除面试记录 */
  deleteSessions: (ids: string[]) =>
    client.delete<void>('/interview/sessions/batch', { data: { ids } }),
}
