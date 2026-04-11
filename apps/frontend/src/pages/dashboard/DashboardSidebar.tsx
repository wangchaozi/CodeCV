import { memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, message } from 'antd'
import {
  Zap,
  LogOut,
  FileText,
  History,
  BookOpen,
  MessageCircle,
  Settings,
} from 'lucide-react'
import type { User } from '../../types/auth.types'

interface DashboardSidebarProps {
  user: User | null
  onLogout: () => void
}

interface NavItem {
  key: string
  icon: React.ElementType
  label: string
  /** 对应路由路径，null 表示功能尚未上线 */
  path: string | null
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '简历管理',
    items: [
      { key: 'library', icon: FileText, label: '简历库', path: '/dashboard/library' },
    ],
  },
  {
    title: '面试·知识',
    items: [
      { key: 'records', icon: History, label: '面试记录', path: '/dashboard/interview-records' },
      { key: 'knowledge', icon: BookOpen, label: '知识库', path: '/knowledge' },
      { key: 'assistant', icon: MessageCircle, label: '问答助手', path: '/assistant' },
    ],
  },
]

export const DashboardSidebar = memo(function DashboardSidebar({
  user,
  onLogout,
}: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path: string | null) =>
    path !== null && (pathname === path || pathname.startsWith(path + '/'))

  const handleNavClick = (_key: string, path: string | null) => {
    if (path === null) {
      message.info('该功能正在开发中，敬请期待')
      return
    }
    navigate(path)
  }

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
            {group.items.map(({ key, icon: Icon, label, path }) => (
              <button
                key={key}
                type="button"
                className={`sidebar-nav-item${isActive(path) ? ' is-active' : ''}${path === null ? ' is-disabled' : ''}`}
                onClick={() => handleNavClick(key, path)}
              >
                <Icon size={17} />
                <span>{label}</span>
                {path === null && <span className="sidebar-nav-soon">即将上线</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <button
          type="button"
          className="sidebar-user-main"
          onClick={() => navigate('/dashboard/profile')}
        >
          <div className="sidebar-user-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="sidebar-avatar-img" />
              : (user?.username ?? 'U').charAt(0).toUpperCase()
            }
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.username ?? '未命名用户'}</span>
            <span className="sidebar-user-email">{user?.email ?? '未设置邮箱'}</span>
          </div>
          <Settings size={13} className="sidebar-user-settings-icon" />
        </button>
        <Button
          type="text"
          size="small"
          icon={<LogOut size={14} />}
          onClick={onLogout}
          title="退出登录"
        />
      </div>
    </aside>
  )
})
