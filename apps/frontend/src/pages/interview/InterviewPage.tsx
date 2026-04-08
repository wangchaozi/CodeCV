import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Radio, Progress, message, Spin, Tag, Modal } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  BookOpen,
  MessageSquareText,
  Layers,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { interviewApi } from '../../api/interview'
import type { InterviewQuestion, InterviewSession, AnswerItem } from '../../api/interview'
import './interview.css'

// ─── 难度标签 ────────────────────────────────────────────────────────────────

const DIFFICULTY_MAP = {
  easy: { label: '简单', color: '#16a34a', bg: '#f0fdf4' },
  medium: { label: '中等', color: '#d97706', bg: '#fffbeb' },
  hard: { label: '困难', color: '#dc2626', bg: '#fef2f2' },
}

// ─── 题目卡片 ─────────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  answer,
  onChange,
}: {
  question: InterviewQuestion
  index: number
  total: number
  answer: string
  onChange: (val: string) => void
}) {
  const diff = DIFFICULTY_MAP[question.difficulty]
  const isMultipleChoice = question.type === 'multiple_choice'

  return (
    <motion.div
      key={question.id}
      className="iq-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="iq-card-header">
        <div className="iq-card-meta">
          <span className="iq-question-num">第 {index + 1} / {total} 题</span>
          <span className="iq-category">{question.category}</span>
          <Tag
            style={{ borderRadius: 999, fontSize: 11, color: diff.color, background: diff.bg, border: `1px solid ${diff.color}30` }}
          >
            {diff.label}
          </Tag>
        </div>
        <div className="iq-type-badge">
          {isMultipleChoice
            ? <><Layers size={13} /><span>选择题</span></>
            : <><MessageSquareText size={13} /><span>问答题</span></>
          }
        </div>
      </div>

      <p className="iq-content">{question.content}</p>

      {isMultipleChoice && question.options ? (
        <Radio.Group
          className="iq-options"
          value={answer}
          onChange={(e) => onChange(e.target.value as string)}
        >
          {question.options.map((opt) => (
            <Radio key={opt} value={opt[0]} className="iq-option">
              {opt}
            </Radio>
          ))}
        </Radio.Group>
      ) : (
        <textarea
          className="iq-textarea"
          placeholder="请输入你的回答（支持多行，尽量详细描述你的思路和方案）"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
      )}
    </motion.div>
  )
}

// ─── 加载/生成中占位 ─────────────────────────────────────────────────────────

function GeneratingPlaceholder() {
  return (
    <div className="iq-generating">
      <Spin size="large" />
      <p className="iq-generating-title">AI 正在根据你的简历生成面试题目...</p>
      <p className="iq-generating-sub">通常需要 10 ~ 30 秒，请耐心等待</p>
    </div>
  )
}

// ─── 结果页 ───────────────────────────────────────────────────────────────────

function ResultPanel({
  session,
  questions,
  answers,
  onViewRecord,
  onBack,
}: {
  session: InterviewSession
  questions: InterviewQuestion[]
  answers: Map<string, string>
  onViewRecord: () => void
  onBack: () => void
}) {
  const mcQuestions = questions.filter((q) => q.type === 'multiple_choice')
  const scoreColor = (session.score ?? 0) >= 80 ? '#16a34a' : (session.score ?? 0) >= 60 ? '#d97706' : '#dc2626'

  return (
    <motion.div
      className="iq-result"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="iq-result-header">
        <CheckCircle2 size={48} color="#16a34a" />
        <h2 className="iq-result-title">面试完成！</h2>
        {session.score !== null && (
          <div className="iq-result-score" style={{ color: scoreColor }}>
            {session.score}
            <span className="iq-result-score-unit">分</span>
          </div>
        )}
        {mcQuestions.length > 0 && session.correctCount !== null && (
          <p className="iq-result-stat">
            选择题：{session.correctCount} / {mcQuestions.length} 题答对
          </p>
        )}
      </div>

      <div className="iq-result-review">
        <h3 className="iq-review-title">答题回顾</h3>
        {questions.map((q, idx) => {
          const userAns = answers.get(q.id) ?? ''
          const isCorrect = q.type === 'multiple_choice'
            ? userAns.toUpperCase() === (q.correctAnswer ?? '').toUpperCase()
            : null

          return (
            <div key={q.id} className="iq-review-item">
              <div className="iq-review-item-header">
                <span className="iq-review-num">Q{idx + 1}</span>
                <span className="iq-review-category">{q.category}</span>
                {isCorrect !== null && (
                  <span className={`iq-review-result ${isCorrect ? 'correct' : 'wrong'}`}>
                    {isCorrect ? '✓ 正确' : '✗ 错误'}
                  </span>
                )}
              </div>
              <p className="iq-review-content">{q.content}</p>
              <div className="iq-review-answer">
                <span className="iq-review-label">你的回答：</span>
                <span className={`iq-review-user-ans ${isCorrect === false ? 'wrong' : ''}`}>
                  {userAns || <em style={{ color: '#9ca3af' }}>（未作答）</em>}
                </span>
              </div>
              {q.type === 'multiple_choice' && isCorrect === false && (
                <div className="iq-review-answer">
                  <span className="iq-review-label">正确答案：</span>
                  <span className="iq-review-correct-ans">{q.correctAnswer}</span>
                </div>
              )}
              {q.explanation && (
                <div className="iq-review-explanation">
                  <BookOpen size={12} color="#6b7280" />
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="iq-result-actions">
        <Button onClick={onBack} size="large">返回简历分析</Button>
        <Button type="primary" onClick={onViewRecord} size="large" icon={<CheckCircle2 size={15} />}>
          查看面试记录
        </Button>
      </div>
    </motion.div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

interface InterviewPageProps {
  /** resume: 恢复进行中的会话；new（默认）: 新建会话 */
  mode?: 'new' | 'resume'
}

export default function InterviewPage({ mode = 'new' }: InterviewPageProps) {
  const { resumeId, sessionId } = useParams<{ resumeId?: string; sessionId?: string }>()
  const navigate = useNavigate()

  const [generating, setGenerating] = useState(true)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)
  const initStartedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (initStartedRef.current) return
    if (mode === 'new' && !resumeId) return
    if (mode === 'resume' && !sessionId) return
    initStartedRef.current = true

    const init = async () => {
      try {
        if (mode === 'resume' && sessionId) {
          // ── 恢复进行中的会话 ─────────────────────────────────────
          const res = await interviewApi.getSessionDetail(sessionId)
          if (!mountedRef.current) return

          const { session: s, questions: qs, answers: existingAnswers } = res.data

          // 恢复已有答案
          const restored = new Map<string, string>()
          for (const a of existingAnswers) {
            restored.set(a.questionId, a.userAnswer)
          }

          // 从第一道未答题开始
          const firstUnanswered = qs.findIndex((q) => !restored.get(q.id)?.trim())
          const startIndex = firstUnanswered === -1 ? 0 : firstUnanswered

          // 恢复已用时间（从会话开始时间到现在）
          const elapsedSecs = Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000)

          setSession(s)
          setQuestions(qs)
          setAnswers(restored)
          setCurrentIndex(startIndex)
          setElapsed(elapsedSecs)
          setGenerating(false)
          timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000)
        } else if (resumeId) {
          // ── 新建会话 ─────────────────────────────────────────────
          const res = await interviewApi.startSession(resumeId)
          if (!mountedRef.current) return
          setSession(res.data.session)
          setQuestions(res.data.questions)
          setGenerating(false)
          timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '启动面试失败'
        message.error(msg)
        navigate(-1)
      }
    }

    void init()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [mode, resumeId, sessionId, navigate])

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? (answers.get(currentQuestion.id) ?? '') : ''

  const setAnswer = useCallback((val: string) => {
    if (!currentQuestion) return
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(currentQuestion.id, val)
      return next
    })
  }, [currentQuestion])

  const handleSubmit = useCallback(async () => {
    if (!session) return

    const unanswered = questions.filter((q) => !(answers.get(q.id) ?? '').trim())
    if (unanswered.length > 0) {
      Modal.confirm({
        title: `还有 ${unanswered.length} 道题未作答`,
        content: '确认提交吗？未作答的题目将计为空答案。',
        okText: '确认提交',
        cancelText: '继续作答',
        onOk: () => void doSubmit(),
      })
      return
    }
    await doSubmit()
  }, [session, questions, answers])

  const doSubmit = async () => {
    if (!session) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const answerItems: AnswerItem[] = questions.map((q) => ({
        questionId: q.id,
        userAnswer: answers.get(q.id) ?? '',
      }))
      const res = await interviewApi.submitSession(session.id, answerItems)
      setSession(res.data)
      setDone(true)
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const answeredCount = questions.filter((q) => (answers.get(q.id) ?? '').trim()).length
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0

  if (generating) {
    return (
      <div className="iq-root">
        <GeneratingPlaceholder />
      </div>
    )
  }

  // 简历 ID 优先从 URL 取，恢复模式时从会话里取
  const actualResumeId = resumeId ?? session?.resumeId

  if (done && session) {
    return (
      <div className="iq-root">
        <ResultPanel
          session={session}
          questions={questions}
          answers={answers}
          onViewRecord={() => navigate('/dashboard/interview-records')}
          onBack={() => navigate(actualResumeId ? `/dashboard/resume/${actualResumeId}` : '/dashboard/library')}
        />
      </div>
    )
  }

  return (
    <div className="iq-root">
      {/* 顶部状态栏 */}
      <header className="iq-header">
        <button
          type="button"
          className="iq-back"
          onClick={() => {
            Modal.confirm({
              title: '确认退出面试？',
              content: mode === 'resume'
                ? '退出后本次未提交的修改将丢失，已保存的答案仍可在面试记录中继续作答。'
                : '退出后当前答题进度将丢失。',
              okText: '确认退出',
              cancelText: '继续作答',
              onOk: () => navigate(-1),
            })
          }}
        >
          <ChevronLeft size={16} />
          <span>退出</span>
        </button>

        <div className="iq-header-center">
          <Progress
            percent={progress}
            size="small"
            strokeColor="#4f46e5"
            style={{ width: 180 }}
            format={() => `${answeredCount}/${questions.length}`}
          />
        </div>

        <div className="iq-timer">
          <Clock size={14} color="#6b7280" />
          <span>{formatTime(elapsed)}</span>
        </div>
      </header>

      {/* 题目导航 */}
      <div className="iq-nav-dots">
        {questions.map((q, idx) => {
          const answered = (answers.get(q.id) ?? '').trim().length > 0
          return (
            <button
              key={q.id}
              type="button"
              className={`iq-dot ${idx === currentIndex ? 'active' : ''} ${answered ? 'answered' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              title={`第 ${idx + 1} 题`}
            />
          )
        })}
      </div>

      {/* 题目区 */}
      <div className="iq-body">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              answer={currentAnswer}
              onChange={setAnswer}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 底部操作 */}
      <footer className="iq-footer">
        <Button
          disabled={currentIndex === 0}
          icon={<ChevronLeft size={15} />}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          上一题
        </Button>

        <div className="iq-footer-info">
          {answeredCount < questions.length && (
            <span className="iq-unanswered-hint">
              <AlertTriangle size={13} color="#d97706" />
              {questions.length - answeredCount} 题未答
            </span>
          )}
        </div>

        {currentIndex < questions.length - 1 ? (
          <Button
            type="primary"
            icon={<ChevronRight size={15} />}
            iconPosition="end"
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            下一题
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<Send size={15} />}
            loading={submitting}
            onClick={() => void handleSubmit()}
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
          >
            提交答卷
          </Button>
        )}
      </footer>
    </div>
  )
}
