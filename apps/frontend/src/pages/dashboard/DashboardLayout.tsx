import { useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { DashboardSidebar } from './DashboardSidebar'
import './dashboard.css'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return (
    <div className="dashboard-root">
      <DashboardSidebar user={user} onLogout={handleLogout} />
      <Outlet />
    </div>
  )
}
