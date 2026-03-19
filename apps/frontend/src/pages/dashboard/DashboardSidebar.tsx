import { memo } from 'react'
import { Button } from 'antd'
import {
  Zap,
  LogOut,
  UploadCloud,
  FileText,
  History,
  BookOpen,
  MessageCircle,
} from 'lucide-react'
import type { User } from '../../types/auth.types'

interface DashboardSidebarProps {
  user: User | null
  activeKey?: string
  onLogout: () => void
}

// 模块级静态数据，避免每次渲染重新创建（rendering-hoist-jsx 原则）
const navGroups = [
  {
    title: '简历管理',
    items: [
      { key: 'upload', icon: UploadCloud, label: '上传简历' },
      { key: 'library', icon: FileText, label: '简历库' },
    ],
  },
  {
    title: '面试·知识',
    items: [
      { key: 'records', icon: History, label: '面试记录' },
      { key: 'knowledge', icon: BookOpen, label: '知识库' },
      { key: 'assistant', icon: MessageCircle, label: '问答助手' },
    ],
  },
]

export const DashboardSidebar = memo(function DashboardSidebar({
  user,
  activeKey = 'library',
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">AI Interview</span>
          <span className="sidebar-logo-sub">智能面试助手</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.title} className="sidebar-nav-group">
            <p className="sidebar-nav-title">{group.title}</p>
            {group.items.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                className={`sidebar-nav-item${key === activeKey ? ' is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {(user?.username ?? 'U').charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.username ?? '未命名用户'}</span>
          <span className="sidebar-user-email">{user?.email ?? '未设置邮箱'}</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<LogOut size={14} />}
          onClick={onLogout}
        >
          退出
        </Button>
      </div>
    </aside>
  )
})
