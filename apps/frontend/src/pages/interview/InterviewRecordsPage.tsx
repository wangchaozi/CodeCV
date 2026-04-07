import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spin, Empty, Tag, Modal, message } from 'antd'
import { motion } from 'framer-motion'
import {
  History,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { interviewApi } from '../../api/interview'
import type { InterviewSession, InterviewQuestion, InterviewAnswer, SessionDetailResponse } from '../../api/interview'
import './interview-records.css'

// ─── 得分颜色 ─────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

function scoreLabel(score: number | null): string {
  if (score === null) return '暂无得分'
  if (score >= 80) return '优秀'
  if (score >= 60) return '良好'
  return '待提升'
}

// ─── 会话详情 Modal ───────────────────────────────────────────────────────────

function SessionDetailModal({
  sessionId,
  open,
  onClose,
}: {
  sessionId: string | null
  open: boolean
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null)

  useEffect(() => {
    if (!sessionId || !open) return
    setLoading(true)
    interviewApi.getSessionDetail(sessionId)
      .then((res) => setDetail(res.data))
      .catch(() => message.error('加载详情失败'))
      .finally(() => setLoading(false))
  }, [sessionId, open])

  const answerMap = new Map<string, InterviewAnswer>(
    (detail?.answers ?? []).map((a) => [a.questionId, a])
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={16} color="#4f46e5" />
          <span>面试详情回顾</span>
        </div>
      }
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', padding: '16px 0' } }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : detail ? (
        <div className="ir-detail">
          <div className="ir-detail-summary">
            <div className="ir-detail-score" style={{ color: scoreColor(detail.session.score) }}>
              {detail.session.score ?? '--'}
              <span className="ir-detail-score-unit">分</span>
            </div>
            <div className="ir-detail-stats">
              <span>共 {detail.session.totalQuestions} 题</span>
              {detail.session.correctCount !== null && (
                <span>选择题 {detail.session.correctCount}/{detail.questions.filter(q => q.type === 'multiple_choice').length} 正确</span>
              )}
            </div>
          </div>

          {detail.questions.map((q: InterviewQuestion, idx: number) => {
            const ans = answerMap.get(q.id)
            const isCorrect = ans?.isCorrect ?? null
            return (
              <div key={q.id} className="ir-detail-item">
                <div className="ir-detail-item-header">
                  <span className="ir-detail-qnum">Q{idx + 1}</span>
                  <span className="ir-detail-qcat">{q.category}</span>
                  <Tag style={{ fontSize: 11, borderRadius: 999 }}>
                    {q.type === 'multiple_choice' ? '选择题' : '问答题'}
                  </Tag>
                  {isCorrect !== null && (
                    <span className={`ir-detail-result ${isCorrect ? 'correct' : 'wrong'}`}>
                      {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    </span>
                  )}
                </div>
                <p className="ir-detail-qcontent">{q.content}</p>
                <div className="ir-detail-answer">
                  <span className="ir-detail-alabel">回答：</span>
                  <span className={`ir-detail-aval ${isCorrect === false ? 'wrong' : ''}`}>
                    {ans?.userAnswer || <em style={{ color: '#9ca3af' }}>（未作答）</em>}
                  </span>
                </div>
                {q.type === 'multiple_choice' && isCorrect === false && (
                  <div className="ir-detail-answer">
                    <span className="ir-detail-alabel">正确答案：</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{q.correctAnswer}</span>
                  </div>
                )}
                {q.explanation && (
                  <div className="ir-detail-explanation">{q.explanation}</div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </Modal>
  )
}

// ─── 记录卡片 ─────────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onViewDetail,
  onRetry,
}: {
  session: InterviewSession
  onViewDetail: () => void
  onRetry: () => void
}) {
  const sc = scoreColor(session.score)
  const sl = scoreLabel(session.score)
  const startDate = new Date(session.startTime)
  const duration = session.endTime
    ? Math.round((new Date(session.endTime).getTime() - startDate.getTime()) / 60000)
    : null

  return (
    <motion.div
      className="ir-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ir-card-left">
        <div className="ir-card-score" style={{ color: sc }}>
          {session.score ?? '--'}
          <span className="ir-card-score-unit">分</span>
        </div>
        <span className="ir-card-score-label" style={{ color: sc }}>{sl}</span>
      </div>

      <div className="ir-card-info">
        <div className="ir-card-resume">
          <FileText size={13} color="#6b7280" />
          <span className="ir-card-resume-name">
            {session.resume?.originalName ?? '已删除的简历'}
          </span>
        </div>
        <div className="ir-card-meta">
          <span>{startDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          <span>·</span>
          <span>{startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          {duration !== null && (
            <>
              <span>·</span>
              <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> 用时 {duration} 分钟</span>
            </>
          )}
          <span>·</span>
          <span>{session.totalQuestions} 题</span>
          {session.correctCount !== null && (
            <><span>·</span><span>{session.correctCount} 题答对</span></>
          )}
        </div>
      </div>

      <div className="ir-card-actions">
        <Tag
          color={session.status === 'completed' ? 'success' : 'processing'}
          style={{ borderRadius: 999 }}
        >
          {session.status === 'completed' ? '已完成' : '进行中'}
        </Tag>
        <Button size="small" icon={<ChevronRight size={13} />} onClick={onViewDetail}>
          查看详情
        </Button>
        {session.resume && (
          <Button size="small" type="primary" icon={<RotateCcw size={13} />} onClick={onRetry}>
            再次面试
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function InterviewRecordsPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await interviewApi.getSessions({ limit: 50 })
      setSessions(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取面试记录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchSessions() }, [fetchSessions])

  return (
    <div className="ir-root">
      <div className="ir-header">
        <div className="ir-header-left">
          <History size={20} color="#4f46e5" />
          <div>
            <h1 className="ir-title">面试记录</h1>
            <p className="ir-sub">共 {total} 条记录</p>
          </div>
        </div>
        <Button onClick={() => navigate('/dashboard/library')} icon={<FileText size={14} />}>
          去简历库
        </Button>
      </div>

      {loading ? (
        <div className="ir-loading"><Spin size="large" /></div>
      ) : sessions.length === 0 ? (
        <div className="ir-empty">
          <Empty
            description="暂无面试记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/dashboard/library')}>
              上传简历开始面试
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="ir-list">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onViewDetail={() => setDetailSessionId(s.id)}
              onRetry={() => {
                if (s.resumeId) navigate(`/interview/${s.resumeId}`)
              }}
            />
          ))}
        </div>
      )}

      <SessionDetailModal
        sessionId={detailSessionId}
        open={detailSessionId !== null}
        onClose={() => setDetailSessionId(null)}
      />
    </div>
  )
}
