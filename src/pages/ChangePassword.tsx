import { useState, FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

export function ChangePassword() {
  const { session, profile, setProfile } = useStore()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) return <Navigate to="/login" replace />

  if (profile && !profile.force_password_change) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ force_password_change: false })
      .eq('id', session.user.id)

    if (profileErr) {
      setError('Password updated but profile sync failed. Please refresh.')
      setLoading(false)
      return
    }

    if (profile) {
      const updated = { ...profile, force_password_change: false }
      setProfile(updated)
      navigate(profile.role === 'admin' ? '/admin' : '/', { replace: true })
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-angler-teal-l border border-angler-teal/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-[22px] font-extrabold text-angler-text">Set Your Password</h1>
          <p className="text-angler-text2 text-[14px] mt-2">
            Choose a new password to secure your account.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-angler-bg rounded-[20px] shadow-card-light p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                New password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-600 text-[13px]"
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
                'Set Password & Continue'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
