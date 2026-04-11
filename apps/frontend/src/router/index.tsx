import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardLayout from '../pages/dashboard/DashboardLayout'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ResumeAnalysisPage from '../pages/dashboard/ResumeAnalysisPage'
import ProfilePage from '../pages/profile/ProfilePage'
import KnowledgeSpacesPage from '../pages/knowledge/KnowledgeSpacesPage'
import KnowledgeSpaceDetailPage from '../pages/knowledge/KnowledgeSpaceDetailPage'
import InterviewPage from '../pages/interview/InterviewPage'
import InterviewRecordsPage from '../pages/interview/InterviewRecordsPage'
import AssistantPage from '../pages/assistant/AssistantPage'
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
      { path: 'resume/:resumeId', element: <ResumeAnalysisPage /> },
      { path: 'interview-records', element: <InterviewRecordsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/interview/:resumeId',
    element: (
      <ProtectedRoute>
        <InterviewPage mode="new" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/interview/resume/:sessionId',
    element: (
      <ProtectedRoute>
        <InterviewPage mode="resume" />
      </ProtectedRoute>
    ),
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
  {
    path: '/assistant',
    element: (
      <ProtectedRoute>
        <AssistantPage />
      </ProtectedRoute>
    ),
  },
])
