import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spin, Empty, Tag, Modal, message, Checkbox } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Trash2,
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
  selected,
  selecting,
  onSelect,
  onViewDetail,
  onRetry,
  onDelete,
}: {
  session: InterviewSession
  selected: boolean
  selecting: boolean
  onSelect: (checked: boolean) => void
  onViewDetail: () => void
  onRetry: () => void
  onDelete: () => void
}) {
  const sc = scoreColor(session.score)
  const sl = scoreLabel(session.score)
  const startDate = new Date(session.startTime)

  const durationText = (() => {
    // 优先使用前端实际计时（无时区问题），旧数据降级到 endTime-startTime
    const totalSecs = (() => {
      if (session.durationSecs != null && session.durationSecs > 0) {
        return session.durationSecs
      }
      if (!session.endTime) return null
      const ms = new Date(session.endTime).getTime() - startDate.getTime()
      if (ms <= 0) return null
      // 差值超过 8 小时，大概率是时区偏差导致的脏数据，不展示
      if (ms > 8 * 60 * 60 * 1000) return null
      return Math.floor(ms / 1000)
    })()

    if (totalSecs == null) return null
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    if (mins === 0) return `${secs} 秒`
    if (mins < 60) return `${mins} 分 ${secs} 秒`
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hours} 小时 ${remainMins} 分` : `${hours} 小时`
  })()

  return (
    <motion.div
      className={`ir-card${selected ? ' is-selected' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 多选框 */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            className="ir-card-checkbox"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 28 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Checkbox checked={selected} onChange={(e) => onSelect(e.target.checked)} />
          </motion.div>
        )}
      </AnimatePresence>

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
          {durationText && (
            <>
              <span>·</span>
              <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> 用时 {durationText}</span>
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
          <Button
            size="small"
            type="primary"
            icon={<RotateCcw size={13} />}
            onClick={onRetry}
            style={session.status === 'in_progress' ? { background: '#d97706', borderColor: '#d97706' } : undefined}
          >
            {session.status === 'in_progress' ? '继续作答' : '再次面试'}
          </Button>
        )}
        {/* 单条删除 */}
        <Button
          size="small"
          danger
          icon={<Trash2 size={13} />}
          onClick={onDelete}
          title="删除此记录"
        />
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

  // 多选相关状态
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)

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

  // 单条删除
  const handleDelete = useCallback((sessionId: string) => {
    Modal.confirm({
      title: '确认删除此面试记录？',
      content: '删除后不可恢复，相关答题数据也将一并删除。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await interviewApi.deleteSession(sessionId)
          message.success('已删除')
          setSessions((prev) => prev.filter((s) => s.id !== sessionId))
          setTotal((prev) => prev - 1)
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(sessionId); return next })
        } catch {
          message.error('删除失败，请重试')
        }
      },
    })
  }, [])

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size
    if (count === 0) return
    Modal.confirm({
      title: `确认删除选中的 ${count} 条记录？`,
      content: '删除后不可恢复，相关答题数据也将一并删除。',
      okText: `删除 ${count} 条`,
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setBatchDeleting(true)
        try {
          await interviewApi.deleteSessions([...selectedIds])
          message.success(`已删除 ${count} 条记录`)
          setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)))
          setTotal((prev) => prev - count)
          setSelectedIds(new Set())
          setSelecting(false)
        } catch {
          message.error('批量删除失败，请重试')
        } finally {
          setBatchDeleting(false)
        }
      },
    })
  }, [selectedIds])

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  const isAllSelected = sessions.length > 0 && selectedIds.size === sessions.length

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(sessions.map((s) => s.id)) : new Set())
  }

  const exitSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

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

        <div className="ir-header-actions">
          {selecting ? (
            <>
              <Checkbox
                checked={isAllSelected}
                indeterminate={selectedIds.size > 0 && !isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                全选
              </Checkbox>
              <Button
                danger
                icon={<Trash2 size={14} />}
                disabled={selectedIds.size === 0}
                loading={batchDeleting}
                onClick={handleBatchDelete}
              >
                删除{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
              <Button onClick={exitSelecting}>取消</Button>
            </>
          ) : (
            <>
              {sessions.length > 0 && (
                <Button
                  icon={<Trash2 size={14} />}
                  onClick={() => setSelecting(true)}
                >
                  批量删除
                </Button>
              )}
              <Button onClick={() => navigate('/dashboard/library')} icon={<FileText size={14} />}>
                去简历库
              </Button>
            </>
          )}
        </div>
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
              selected={selectedIds.has(s.id)}
              selecting={selecting}
              onSelect={(checked) => toggleSelect(s.id, checked)}
              onViewDetail={() => setDetailSessionId(s.id)}
              onDelete={() => handleDelete(s.id)}
              onRetry={() => {
                if (s.status === 'in_progress') {
                  navigate(`/interview/resume/${s.id}`)
                } else if (s.resumeId) {
                  navigate(`/interview/${s.resumeId}`)
                }
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
