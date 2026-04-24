import { useState, FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen bg-admin-bg text-admin-text flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-admin-teal-dim border border-admin-teal/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-[22px] font-extrabold text-admin-text">Set Your Password</h1>
          <p className="text-admin-text2 text-sm mt-2">
            Choose a new password to secure your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-text2 mb-1.5">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full bg-admin-bg2 border border-admin-border rounded-[12px] px-4 py-3 text-[14px] text-admin-text placeholder-admin-text3 focus:outline-none focus:border-admin-teal transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-text2 mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full bg-admin-bg2 border border-admin-border rounded-[12px] px-4 py-3 text-[14px] text-admin-text placeholder-admin-text3 focus:outline-none focus:border-admin-teal transition-colors min-h-[44px]"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-admin-red text-sm"
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
              'Set Password & Continue'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
