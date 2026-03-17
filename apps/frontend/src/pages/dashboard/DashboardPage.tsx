import { Button, Tag } from 'antd'
import { motion } from 'framer-motion'
import { Zap, LogOut, Construction } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f6fa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '48px 56px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
          maxWidth: 480,
          width: '90%',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #5b5bd6, #7c3aed)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Zap size={26} color="white" strokeWidth={2.5} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          你好，{user?.username ?? '用户'} 👋
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 20px' }}>
          {user?.email}
        </p>

        <Tag
          color="purple"
          style={{ borderRadius: 6, padding: '2px 10px', marginBottom: 32 }}
        >
          {user?.role === 'admin' ? '管理员' : '普通用户'}
        </Tag>

        <div
          style={{
            background: '#f9fafb',
            border: '1px dashed #e5e7eb',
            borderRadius: 12,
            padding: '28px 24px',
            marginBottom: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Construction size={28} color="#9ca3af" />
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            Dashboard 功能开发中，敬请期待
          </p>
        </div>

        <Button
          icon={<LogOut size={15} />}
          onClick={handleLogout}
          style={{ borderRadius: 8 }}
        >
          退出登录
        </Button>
      </motion.div>
    </div>
  )
}
