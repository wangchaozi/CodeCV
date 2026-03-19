import { lazy, Suspense, memo, useState, useCallback } from 'react'
import { Button, Tag } from 'antd'
import { motion } from 'framer-motion'
import { FolderOpenDot, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { DashboardSidebar } from './DashboardSidebar'
import type { Resume } from '../../types/resume.types'
import './dashboard.css'

// bundle-dynamic-imports: recharts 较重，预览面板懒加载，首屏不阻塞
const ResumePreviewDrawer = lazy(() =>
  import('./ResumePreviewDrawer').then((m) => ({ default: m.ResumePreviewDrawer })),
)

// 模块级静态数据（rendering-hoist-jsx：不在组件内定义常量）
// 前两条附带演示用 PDF（Mozilla 官方样本），模拟后端返回 URL
const DEMO_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf'

const mockResumes: Resume[] = [
  { id: 1, name: '京东科技-三年经验-物流平台和智能管理系统.pdf', date: '2025/12/30', score: 86, status: '已完成', url: DEMO_PDF },
  { id: 2, name: '社招简历1.pdf', date: '2026/01/02', score: 78, status: '已完成', url: DEMO_PDF },
  { id: 3, name: '校招简历3.pdf', date: '2026/01/02', score: 78, status: '待面试' },
  { id: 4, name: '布朗大学校招.pdf', date: '2026/01/03', score: 82, status: '待面试' },
  { id: 5, name: '北京大学本硕（投递）.pdf', date: '2026/01/03', score: 68, status: '待面试' },
]

// rerender-no-inline-components: 将行组件提取到模块级
interface ResumeRowProps {
  resume: Resume
  onView: (resume: Resume) => void
}

const ResumeRow = memo(function ResumeRow({ resume, onView }: ResumeRowProps) {
  // rerender-functional-setstate: 事件回调稳定，不产生多余闭包
  const handleView = useCallback(() => onView(resume), [onView, resume])

  return (
    <div className="dashboard-row">
      <div className="col-name">
        <FileText size={16} className="row-icon" />
        <span className="row-name" title={resume.name}>
          {resume.name}
        </span>
      </div>
      <div className="col-date">{resume.date}</div>
      <div className="col-score">
        <div className="score-bar">
          <div
            className={`score-bar-inner score-${Math.round(resume.score / 10)}`}
            style={{ width: `${resume.score}%` }}
          />
        </div>
        <span className="score-text">{resume.score}</span>
      </div>
      <div className="col-status">
        {/* rendering-conditional-render: 用三元替代 && 避免 0 渲染问题 */}
        <span className={`status-pill status-${resume.status === '已完成' ? 'done' : 'pending'}`}>
          {resume.status}
        </span>
      </div>
      <div className="col-actions">
        <Button type="link" size="small" onClick={handleView}>
          查看
        </Button>
        <Button type="link" size="small" danger>
          删除
        </Button>
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // rerender-move-effect-to-event: 逻辑放事件处理器而非 useEffect
  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const handleView = useCallback((resume: Resume) => {
    setSelectedResume(resume)
    setDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  return (
    <div className="dashboard-root">
      <DashboardSidebar user={user} onLogout={handleLogout} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1 className="dashboard-title">简历库</h1>
            <p className="dashboard-subtitle">管理和分析所有简历及面试记录</p>
          </div>
          <div className="dashboard-header-right">
            <div className="dashboard-search">
              <input placeholder="搜索简历..." />
            </div>
            <Tag color="purple" className="dashboard-tag">
              {user?.role === 'admin' ? '管理员' : '普通用户'}
            </Tag>
          </div>
        </header>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FolderOpenDot size={18} />
              <span>最新导入</span>
            </div>
            <span className="dashboard-card-sub">最近上传的简历列表（仅做展示，无实际数据）</span>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table-head">
              <span className="col-name">简历名称</span>
              <span className="col-date">上传日期</span>
              <span className="col-score">AI 评分</span>
              <span className="col-status">面试状态</span>
              <span className="col-actions">操作</span>
            </div>

            <motion.div
              className="dashboard-table-body"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {mockResumes.map((item) => (
                <ResumeRow key={item.id} resume={item} onView={handleView} />
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* async-suspense-boundaries + bundle-dynamic-imports: Drawer 懒加载，fallback=null 不影响布局 */}
      <Suspense fallback={null}>
        <ResumePreviewDrawer
          resume={selectedResume}
          open={drawerOpen}
          onClose={handleCloseDrawer}
        />
      </Suspense>
    </div>
  )
}
