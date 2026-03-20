import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Tooltip, message } from 'antd'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  FileText,
  User,
  Briefcase,
  Code2,
  GraduationCap,
  FolderGit2,
  Target,
  Zap,
  MessageSquare,
  Brain,
  Layers,
  Star,
  TrendingUp,
  PlayCircle,
  Sparkles,
} from 'lucide-react'

// ─── Mock 解析数据 ──────────────────────────────────────────────────────────────

const MOCK_RESUME_DATA: Record<string, ResumeData> = {
  default: {
    name: '京东科技-三年经验-物流平台和智能管理系统.pdf',
    score: 86,
    candidate: {
      name: '王子昊',
      phone: '138****8888',
      email: 'wzh@example.com',
      location: '北京',
      experience: '3 年工作经验',
    },
    summary:
      '资深前端工程师，专注于 Vue3 / React 技术栈，主导过物流平台前端架构重构及智能管理系统研发，具备良好的工程化思维和性能优化经验。',
    experience: [
      {
        id: 1,
        company: '京东科技',
        role: '高级前端工程师',
        period: '2022.06 — 2025.01',
        bullets: [
          '主导物流可视化平台前端架构重构，引入微前端方案，使构建时间缩短 40%',
          '主导智能管理系统研发（Vue3 + TypeScript），实现可配置化大屏组件体系',
          '封装公司级 UI 组件库，覆盖 30+ 基础组件，被 5 个业务团队采用',
          '推动前端 CI/CD 流程建设，提升发布频率 3 倍，故障率下降 60%',
        ],
      },
      {
        id: 2,
        company: '某互联网公司',
        role: '前端工程师',
        period: '2020.07 — 2022.05',
        bullets: [
          '参与 B2B 电商平台前端开发，负责商品管理、订单结算等核心模块',
          '使用 Webpack + React 完成项目工程化改造，首屏加载提速 55%',
          '协助组内推广单元测试规范，核心模块覆盖率从 0 提升至 76%',
        ],
      },
    ],
    skills: [
      { category: '前端框架', items: ['Vue3', 'React 18', 'Nuxt3', 'Next.js'] },
      { category: '工程化', items: ['Vite', 'Webpack5', 'Rollup', 'pnpm Monorepo'] },
      { category: '语言 & 样式', items: ['TypeScript', 'JavaScript ES2022', 'Sass/Less', 'CSS Modules'] },
      { category: '状态管理', items: ['Pinia', 'Zustand', 'Redux Toolkit'] },
      { category: '测试 & 质量', items: ['Vitest', 'Jest', 'Playwright', 'ESLint + Prettier'] },
      { category: '后端 & 工具', items: ['Node.js', 'NestJS', 'Docker', 'Git', 'MySQL'] },
    ],
    projects: [
      {
        id: 1,
        name: '物流可视化平台（微前端重构）',
        period: '2023.03 — 2024.06',
        bullets: [
          '使用 qiankun 微前端方案将 3 个独立子系统整合，减少重复代码 30%',
          '设计通用状态共享机制，解决跨应用通信及权限隔离问题',
          '接入 ECharts + WebSocket 实现物流数据实时大屏，支持亿级数据渲染',
        ],
      },
      {
        id: 2,
        name: '智能管理系统大屏组件库',
        period: '2022.09 — 2023.02',
        bullets: [
          '基于 Vue3 + Canvas 构建可拖拽、可配置化大屏组件系统，支持 20+ 组件类型',
          '设计 JSON Schema 驱动的配置协议，实现低代码拖拽搭建能力',
          '首屏渲染性能优化，FCP 从 3.2s 降低至 1.1s',
        ],
      },
    ],
    education: [
      {
        school: '北京邮电大学',
        degree: '计算机科学与技术 · 本科',
        period: '2016 — 2020',
      },
    ],
  },
}

interface ResumeData {
  name: string
  score: number
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

// ─── Mock 面试侧重点数据 ────────────────────────────────────────────────────────

interface FocusTopic {
  label: string
  weight: 'high' | 'medium' | 'low'
  desc: string
}

interface FocusCategory {
  id: string
  icon: React.ElementType
  title: string
  color: string
  bg: string
  topics: FocusTopic[]
}

const FOCUS_CATEGORIES: FocusCategory[] = [
  {
    id: 'tech',
    icon: Code2,
    title: '技术深度',
    color: '#4f46e5',
    bg: '#eef2ff',
    topics: [
      { label: 'Vue3 响应式原理', weight: 'high', desc: '深入考察 Proxy/Reflect、track/trigger 机制' },
      { label: 'React Hooks 原理', weight: 'high', desc: 'useState/useEffect 底层实现与闭包陷阱' },
      { label: 'TypeScript 类型系统', weight: 'medium', desc: '泛型、条件类型、映射类型' },
      { label: '浏览器渲染机制', weight: 'medium', desc: '重排重绘、合成层、事件循环' },
    ],
  },
  {
    id: 'architecture',
    icon: Layers,
    title: '系统设计',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    topics: [
      { label: '微前端架构', weight: 'high', desc: '结合项目经历深入追问 qiankun 原理与难点' },
      { label: '组件库设计', weight: 'high', desc: '组件封装思路、文档规范、版本管理' },
      { label: '前端工程化', weight: 'medium', desc: 'Vite/Webpack 构建优化、Tree-shaking' },
      { label: 'Monorepo 实践', weight: 'medium', desc: 'pnpm workspace、包依赖管理策略' },
    ],
  },
  {
    id: 'project',
    icon: FolderGit2,
    title: '项目亮点',
    color: '#16a34a',
    bg: '#f0fdf4',
    topics: [
      { label: '物流大屏性能优化', weight: 'high', desc: '追问亿级数据渲染方案，虚拟列表/Canvas' },
      { label: 'CI/CD 流程建设', weight: 'medium', desc: '具体方案、遇到的挑战及解决思路' },
      { label: '组件库推广策略', weight: 'medium', desc: '如何推动跨团队采用，遇到的阻力' },
      { label: '大屏 FCP 优化', weight: 'high', desc: '3.2s → 1.1s 的具体优化手段' },
    ],
  },
  {
    id: 'performance',
    icon: TrendingUp,
    title: '性能优化',
    color: '#d97706',
    bg: '#fffbeb',
    topics: [
      { label: '首屏加载优化', weight: 'high', desc: '代码分割、懒加载、预加载策略' },
      { label: 'WebSocket 大数据', weight: 'medium', desc: '数据量大时的渲染策略和内存管理' },
      { label: 'Bundle 分析', weight: 'medium', desc: '使用什么工具分析，如何减小体积' },
    ],
  },
  {
    id: 'soft',
    icon: MessageSquare,
    title: '综合能力',
    color: '#7c3aed',
    bg: '#faf5ff',
    topics: [
      { label: '团队协作 & 技术推广', weight: 'medium', desc: '如何推动组件库在多团队落地' },
      { label: '技术决策思路', weight: 'medium', desc: '微前端选型依据与取舍' },
      { label: '项目复盘能力', weight: 'low', desc: '如何总结和沉淀项目经验' },
    ],
  },
]

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

function AnalysisPanel({ data }: { data: ResumeData }) {
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
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
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
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
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

function FocusPanel({ onStart }: { onStart: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('tech')

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
        {FOCUS_CATEGORIES.map((cat) => (
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
              <div className="ra-focus-category-icon" style={{ background: cat.bg, color: cat.color }}>
                <cat.icon size={14} />
              </div>
              <span className="ra-focus-category-title">{cat.title}</span>
              <span className="ra-focus-category-count" style={{ color: cat.color, background: cat.bg }}>
                {cat.topics.length} 个考点
              </span>
              <span className="ra-focus-chevron">{expanded === cat.id ? '▲' : '▼'}</span>
            </button>

            {expanded === cat.id && (
              <motion.div
                className="ra-focus-topics"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
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
        ))}
      </div>

      {/* 开始面试按钮 */}
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

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function ResumeAnalysisPage() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const navigate = useNavigate()

  const data = MOCK_RESUME_DATA[resumeId ?? ''] ?? MOCK_RESUME_DATA.default

  const handleStartInterview = useCallback(() => {
    message.info('面试功能正在开发中，敬请期待')
  }, [])

  const scoreColor = data.score >= 85 ? '#16a34a' : data.score >= 70 ? '#d97706' : '#dc2626'

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
        <span className="ra-topbar-name" title={data.name}>{data.name}</span>

        <div className="ra-topbar-right">
          <div className="ra-topbar-score">
            <span className="ra-topbar-score-label">AI 评分</span>
            <span className="ra-topbar-score-value" style={{ color: scoreColor }}>{data.score}</span>
          </div>
          <Tag color="blue" style={{ borderRadius: 999, fontSize: 12 }}>解析完成</Tag>
          <Button
            type="primary"
            icon={<PlayCircle size={15} />}
            onClick={handleStartInterview}
            style={{ borderRadius: 8 }}
          >
            开始面试
          </Button>
        </div>
      </header>

      {/* 主体 */}
      <div className="ra-body">
        <motion.div
          className="ra-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* 左侧：解析内容 */}
          <AnalysisPanel data={data} />

          {/* 右侧：面试侧重点 */}
          <FocusPanel onStart={handleStartInterview} />
        </motion.div>
      </div>
    </div>
  )
}
