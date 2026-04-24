import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

export function Login() {
  const { session, profile, authLoading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-admin-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session && profile) {
    if (profile.force_password_change) return <Navigate to="/change-password" replace />
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-admin-teal-dim border border-admin-teal/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎣</span>
          </div>
          <h1 className="text-[30px] font-extrabold text-admin-text tracking-tight">CastLog</h1>
          <p className="text-admin-text2 mt-1 text-sm">Track catches. Reel in glory.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-text2 mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="angler@example.com"
              className="w-full bg-admin-bg2 border border-admin-border rounded-[12px] px-4 py-3 text-[14px] text-admin-text placeholder-admin-text3 focus:outline-none focus:border-admin-teal transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-text2 mb-1.5">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-admin-bg2 border border-admin-border rounded-[12px] px-4 py-3 text-[14px] text-admin-text placeholder-admin-text3 focus:outline-none focus:border-admin-teal transition-colors min-h-[44px]"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-admin-red text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="bg-admin-teal text-admin-bg font-extrabold text-base py-3.5 rounded-[12px] min-h-[44px] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-admin-bg border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <p className="text-center text-admin-text3 text-xs mt-8">
          Accounts are created by your competition admin.
        </p>
      </motion.div>
    </div>
  )
}
