import { useCallback, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { DashboardSidebar } from './DashboardSidebar'
import { ResumeUploadModal } from './ResumeUploadModal'
import './dashboard.css'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return (
    <div className="dashboard-root">
      <DashboardSidebar
        user={user}
        onLogout={handleLogout}
        onUploadClick={() => setUploadOpen(true)}
      />
      <Outlet />
      <ResumeUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
