import { Outlet, Navigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'

export function AdminGuard() {
  const { session, profile, authLoading } = useStore()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center font-sans">
        <div className="w-12 h-12 border-2 border-admin-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (profile?.force_password_change) return <Navigate to="/change-password" replace />

  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}
