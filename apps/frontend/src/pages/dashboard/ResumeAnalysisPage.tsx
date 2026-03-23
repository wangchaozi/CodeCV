import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Tooltip, message, Spin } from 'antd'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  FileText,
  User,
  Briefcase,
  Code2,
  GraduationCap,
  FolderGit2,
  MessageSquare,
  Brain,
  Layers,
  TrendingUp,
  PlayCircle,
  Sparkles,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { resumeApi, type ResumeRecord, type ParsedResumeContent, type InterviewFocus } from '../../api/resume'

// ─── 面试侧重点 Icon 映射 ──────────────────────────────────────────────────────

const FOCUS_ICON_MAP: Record<string, React.ElementType> = {
  tech: Code2,
  architecture: Layers,
  project: FolderGit2,
  performance: TrendingUp,
  soft: MessageSquare,
}

// ─── 权重配置 ─────────────────────────────────────────────────────────────────

const WEIGHT_CONFIG = {
  high: { label: '重点', color: '#dc2626', bg: '#fef2f2' },
  medium: { label: '常考', color: '#d97706', bg: '#fffbeb' },
  low: { label: '拓展', color: '#6b7280', bg: '#f9fafb' },
}

// ─── 子组件 ────────────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className="ra-section-title">
      <Icon size={15} color={color ?? '#4f46e5'} />
      <span>{title}</span>
    </div>
  )
}

function AnalysisPanel({ data }: { data: ParsedResumeContent }) {
  return (
    <div className="ra-left-panel">
      {/* 个人信息 */}
      <section className="ra-section">
        <SectionTitle icon={User} title="个人信息" />
        <div className="ra-person-card">
          <div className="ra-person-avatar">{data.candidate.name.charAt(0)}</div>
          <div className="ra-person-info">
            <span className="ra-person-name">{data.candidate.name}</span>
            <span className="ra-person-exp">{data.candidate.experience}</span>
            <div className="ra-person-contacts">
              <span>{data.candidate.phone}</span>
              <span>·</span>
              <span>{data.candidate.email}</span>
              <span>·</span>
              <span>{data.candidate.location}</span>
            </div>
          </div>
        </div>
        <p className="ra-summary">{data.summary}</p>
      </section>

      {/* 工作经历 */}
      <section className="ra-section">
        <SectionTitle icon={Briefcase} title="工作经历" color="#0ea5e9" />
        <div className="ra-timeline">
          {data.experience.map((exp) => (
            <div key={exp.id} className="ra-timeline-item">
              <div className="ra-timeline-dot" />
              <div className="ra-timeline-content">
                <div className="ra-exp-header">
                  <span className="ra-exp-company">{exp.company}</span>
                  <span className="ra-exp-period">{exp.period}</span>
                </div>
                <span className="ra-exp-role">{exp.role}</span>
                <ul className="ra-bullet-list">
                  {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 技术栈 */}
      <section className="ra-section">
        <SectionTitle icon={Code2} title="技术技能" color="#7c3aed" />
        <div className="ra-skills-grid">
          {data.skills.map((group) => (
            <div key={group.category} className="ra-skill-group">
              <span className="ra-skill-category">{group.category}</span>
              <div className="ra-skill-tags">
                {group.items.map((item) => (
                  <span key={item} className="ra-skill-tag">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 项目经历 */}
      <section className="ra-section">
        <SectionTitle icon={FolderGit2} title="项目经历" color="#16a34a" />
        <div className="ra-timeline">
          {data.projects.map((proj) => (
            <div key={proj.id} className="ra-timeline-item">
              <div className="ra-timeline-dot ra-timeline-dot-green" />
              <div className="ra-timeline-content">
                <div className="ra-exp-header">
                  <span className="ra-exp-company">{proj.name}</span>
                  <span className="ra-exp-period">{proj.period}</span>
                </div>
                <ul className="ra-bullet-list">
                  {proj.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 教育背景 */}
      <section className="ra-section">
        <SectionTitle icon={GraduationCap} title="教育背景" color="#d97706" />
        {data.education.map((edu) => (
          <div key={edu.school} className="ra-edu-card">
            <span className="ra-edu-school">{edu.school}</span>
            <span className="ra-edu-degree">{edu.degree}</span>
            <span className="ra-edu-period">{edu.period}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

function FocusPanel({ focusData, onStart }: { focusData: InterviewFocus[]; onStart: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(focusData[0]?.id ?? null)

  return (
    <div className="ra-right-panel">
      <div className="ra-right-header">
        <div className="ra-right-title">
          <Sparkles size={16} color="#4f46e5" />
          <span>AI 面试侧重点</span>
        </div>
        <p className="ra-right-sub">基于简历内容智能分析，精准定位面试考察方向</p>
      </div>

      <div className="ra-focus-list">
        {focusData.map((cat) => {
          const IconComp = FOCUS_ICON_MAP[cat.id] ?? Code2
          const bg = cat.color + '18'
          return (
            <div
              key={cat.id}
              className={`ra-focus-category${expanded === cat.id ? ' is-expanded' : ''}`}
            >
              <button
                type="button"
                className="ra-focus-category-header"
                style={{ borderColor: expanded === cat.id ? cat.color : 'transparent' }}
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <div className="ra-focus-category-icon" style={{ background: bg, color: cat.color }}>
                  <IconComp size={14} />
                </div>
                <span className="ra-focus-category-title">{cat.title}</span>
                <span className="ra-focus-category-count" style={{ color: cat.color, background: bg }}>
                  {cat.topics.length} 个考点
                </span>
                <span className="ra-focus-chevron">{expanded === cat.id ? '▲' : '▼'}</span>
              </button>

              {expanded === cat.id && (
                <motion.div
                  className="ra-focus-topics"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                >
                  {cat.topics.map((topic) => {
                    const wCfg = WEIGHT_CONFIG[topic.weight]
                    return (
                      <Tooltip key={topic.label} title={topic.desc} placement="left">
                        <div className="ra-focus-topic-item">
                          <span
                            className="ra-focus-weight"
                            style={{ color: wCfg.color, background: wCfg.bg }}
                          >
                            {wCfg.label}
                          </span>
                          <span className="ra-focus-topic-label">{topic.label}</span>
                        </div>
                      </Tooltip>
                    )
                  })}
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      <div className="ra-start-wrap">
        <div className="ra-start-hint">
          <Brain size={14} color="#6b7280" />
          <span>AI 将根据以上侧重点针对性提问</span>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlayCircle size={17} />}
          onClick={onStart}
          className="ra-start-btn"
          block
        >
          开始面试
        </Button>
      </div>
    </div>
  )
}

// ─── 解析中状态占位 ────────────────────────────────────────────────────────────

function ParsingPlaceholder({ onReparse }: { onReparse: () => void }) {
  return (
    <div className="ra-parsing-placeholder">
      <div className="ra-parsing-icon">
        <Loader2 size={36} className="ra-parsing-spin" color="#4f46e5" />
      </div>
      <p className="ra-parsing-title">AI 正在解析简历...</p>
      <p className="ra-parsing-sub">通常需要 3 ~ 10 秒，请稍候</p>
      <Button
        icon={<RefreshCw size={14} />}
        size="small"
        onClick={onReparse}
        style={{ marginTop: 8 }}
      >
        手动刷新
      </Button>
    </div>
  )
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function ResumeAnalysisPage() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const navigate = useNavigate()

  const [resume, setResume] = useState<ResumeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchResume = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await resumeApi.getById(id)
      setResume(res.data)
      setError(null)
      // 如果已解析完成，停止轮询
      if (res.data.status === 'done' || res.data.status === 'error') {
        stopPoll()
      }
    } catch {
      setError('获取简历详情失败，请检查网络或刷新页面')
      stopPoll()
    } finally {
      setLoading(false)
    }
  }, [stopPoll])

  // 初次加载 + 如果仍在解析则轮询
  useEffect(() => {
    if (!resumeId) return
    void fetchResume(resumeId)
  }, [resumeId, fetchResume])

  useEffect(() => {
    if (!resume || !resumeId) return
    if (resume.status === 'parsing' || resume.status === 'pending') {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => void fetchResume(resumeId, true), 3000)
      }
    } else {
      stopPoll()
    }
    return () => stopPoll()
  }, [resume?.status, resumeId, fetchResume, stopPoll])

  const handleStartInterview = useCallback(() => {
    message.info('面试功能正在开发中，敬请期待')
  }, [])

  const handleReparse = useCallback(async () => {
    if (!resumeId) return
    try {
      await resumeApi.reparse(resumeId)
      message.success('已触发重新解析')
      void fetchResume(resumeId, true)
    } catch {
      message.error('重新解析失败')
    }
  }, [resumeId, fetchResume])

  if (loading) {
    return (
      <div className="ra-root">
        <div className="ra-loading-center">
          <Spin size="large" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div className="ra-root">
        <div className="ra-loading-center">
          <p style={{ color: '#dc2626' }}>{error ?? '简历不存在'}</p>
          <Button onClick={() => navigate('/dashboard/library')}>返回简历库</Button>
        </div>
      </div>
    )
  }

  const isParsing = resume.status === 'pending' || resume.status === 'parsing'
  const scoreColor = (resume.score ?? 0) >= 85 ? '#16a34a' : (resume.score ?? 0) >= 70 ? '#d97706' : '#dc2626'

  return (
    <div className="ra-root">
      {/* 顶部栏 */}
      <header className="ra-topbar">
        <button
          type="button"
          className="ra-topbar-back"
          onClick={() => navigate('/dashboard/library')}
        >
          <ChevronLeft size={15} />
          <span>简历库</span>
        </button>
        <div className="ra-topbar-divider" />
        <FileText size={14} color="#4f46e5" style={{ flexShrink: 0 }} />
        <span className="ra-topbar-name" title={resume.originalName}>{resume.originalName}</span>

        <div className="ra-topbar-right">
          {resume.score != null && (
            <div className="ra-topbar-score">
              <span className="ra-topbar-score-label">AI 评分</span>
              <span className="ra-topbar-score-value" style={{ color: scoreColor }}>{resume.score}</span>
            </div>
          )}
          <Tag
            color={resume.status === 'done' ? 'success' : resume.status === 'error' ? 'error' : 'processing'}
            style={{ borderRadius: 999, fontSize: 12 }}
          >
            {resume.status === 'done' ? '解析完成'
              : resume.status === 'error' ? '解析失败'
              : 'AI 解析中...'}
          </Tag>
          <Button
            type="primary"
            icon={<PlayCircle size={15} />}
            onClick={handleStartInterview}
            disabled={isParsing}
            style={{ borderRadius: 8 }}
          >
            开始面试
          </Button>
        </div>
      </header>

      {/* 主体 */}
      <div className="ra-body">
        {isParsing ? (
          <div className="ra-content ra-content-single">
            <ParsingPlaceholder onReparse={() => void handleReparse()} />
          </div>
        ) : (
          <motion.div
            className="ra-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {resume.parsedContent && <AnalysisPanel data={resume.parsedContent} />}
            {resume.interviewFocus && resume.interviewFocus.length > 0 && (
              <FocusPanel focusData={resume.interviewFocus} onStart={handleStartInterview} />
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
