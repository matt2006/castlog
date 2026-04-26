import { useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store/useStore'

export function AuthGuard() {
  const { session, profile, authLoading } = useStore()
  const location = useLocation()

  if (authLoading) {
    return (
      <div data-theme="angler" className="min-h-screen bg-angler-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-angler-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-angler-text3 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile?.force_password_change && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
