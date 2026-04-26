import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

export function Login() {
  const { session, profile, authLoading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep auth loading on admin-dark to prevent flash-of-white before redirect.
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
    <div
      data-theme="angler"
      className="min-h-screen bg-angler-white text-angler-text flex flex-col items-center justify-center px-5 py-10 font-sans"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Pyes Perchers"
            className="w-56 h-56 object-contain"
            draggable={false}
          />
        </div>

        {/* Form card — angler-bg sits just off pure white, giving clear elevation */}
        <div className="bg-angler-bg rounded-[20px] shadow-card-light p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="angler@example.com"
                className="w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-600 text-[13px] text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="bg-angler-teal text-white font-extrabold text-[15px] py-3.5 rounded-[12px] min-h-[44px] mt-1 flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-angler-text3 text-[12px] mt-6">
          Accounts are created by your competition admin.
        </p>
      </motion.div>
    </div>
  )
}
