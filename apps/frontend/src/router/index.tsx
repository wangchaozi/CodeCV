import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardLayout from '../pages/dashboard/DashboardLayout'
import DashboardPage from '../pages/dashboard/DashboardPage'
import KnowledgeSpacesPage from '../pages/knowledge/KnowledgeSpacesPage'
import KnowledgeSpaceDetailPage from '../pages/knowledge/KnowledgeSpaceDetailPage'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="library" replace /> },
      { path: 'library', element: <DashboardPage /> },
    ],
  },
  {
    path: '/knowledge',
    element: (
      <ProtectedRoute>
        <KnowledgeSpacesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/knowledge/:spaceId',
    element: (
      <ProtectedRoute>
        <KnowledgeSpaceDetailPage />
      </ProtectedRoute>
    ),
  },
])
