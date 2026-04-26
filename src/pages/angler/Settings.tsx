import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase, generateTempPassword } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '@/lib/achievements'
import { SPECIES } from '@/lib/species'
import { CatchDetailModal } from '@/components/shared/CatchDetailModal'
import type { AchievementEarned, Catch, Competition, Profile, Venue } from '@/types'

// ── Shared style constants ────────────────────────────────────────────────────
const INPUT = 'w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]'
const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5'
type ShowToast = (msg: string, kind?: 'success' | 'error') => void

// ── Shared UI primitives ──────────────────────────────────────────────────────

/** Bottom-slide sheet — renders backdrop + panel inside an AnimatePresence. */
function Sheet({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div
        key="sh-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        key="sh-panel"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 h-[85vh] bg-angler-white rounded-t-[24px] z-50 flex flex-col overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-angler-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-angler-border flex-shrink-0">
          <h3 className="font-extrabold text-angler-text text-[18px]">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-angler-text2 text-[22px]">×</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </motion.div>
    </>
  )
}

/** Centered confirmation modal. */
function Confirm({
  title, body, confirmLabel, confirmClass, loading, onConfirm, onCancel,
}: {
  title: string
  body: React.ReactNode
  confirmLabel: string
  confirmClass?: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <motion.div
        key="conf-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onCancel}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-angler-white rounded-[18px] shadow-card-light p-5 max-w-sm w-full"
        >
          <h3 className="font-extrabold text-angler-text text-[18px] mb-2">{title}</h3>
          <div className="text-angler-text2 text-[14px] mb-5 leading-snug">{body}</div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 h-11 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]">
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={loading}
              className={`flex-1 h-11 rounded-[12px] text-white font-bold text-[15px] disabled:opacity-50 ${confirmClass ?? 'bg-red-500'}`}
            >
              {loading ? '…' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

/** Floating toast — fixed bottom-centre. */
function ToastBanner({ toast }: { toast: { msg: string; kind: 'success' | 'error' } | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
        >
          <div className={`rounded-[14px] px-4 py-3 shadow-elevated-light font-semibold text-[14px] flex items-center gap-2 whitespace-nowrap ${
            toast.kind === 'success'
              ? 'bg-angler-white border border-angler-border text-angler-text'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {toast.kind === 'success' ? '✓' : '⚠'} {toast.msg}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Collapsible section wrapper — lazy-mounts children on first open. */
function SectionCard({
  icon, title, defaultOpen = false, children,
}: { icon: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(defaultOpen)

  const toggle = () => {
    if (!mounted) setMounted(true)
    setOpen((v) => !v)
  }

  return (
    <div className="bg-angler-white rounded-[18px] shadow-card-light overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-[22px] leading-none">{icon}</span>
        <h2 className="flex-1 font-bold text-angler-text text-[17px] leading-tight">{title}</h2>
        <span className="text-angler-text3 text-[12px] font-semibold">{open ? '▲' : '▼'}</span>
      </button>
      {mounted && (
        <div className={open ? 'border-t border-angler-border' : 'hidden'}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── App Overview ──────────────────────────────────────────────────────────────

interface OverviewStats {
  totalAnglers: number
  totalCatches: number
  activeCompetitions: number
  totalWeight: number
}

function OverviewSection({ showToast }: { showToast: ShowToast }) {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [recentCatches, setRecentCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)

  // suppress unused-prop warning
  void showToast

  useEffect(() => {
    async function load() {
      const [profilesRes, recentRes, competitionsRes, weightRes, countRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('catches').select('*, profiles(username, avatar_emoji, avatar_color)').order('timestamp', { ascending: false }).limit(20),
        supabase.from('competitions').select('id', { count: 'exact', head: true }).eq('status', 'live'),
        supabase.from('catches').select('weight_kg'),
        supabase.from('catches').select('id', { count: 'exact', head: true }),
      ])
      const totalWeight = (weightRes.data ?? []).reduce((s, c) => s + (c.weight_kg ?? 0), 0)
      setStats({
        totalAnglers: profilesRes.count ?? 0,
        totalCatches: countRes.count ?? 0,
        activeCompetitions: competitionsRes.count ?? 0,
        totalWeight,
      })
      setRecentCatches((recentRes.data ?? []) as Catch[])
      setLoading(false)
    }
    load()
  }, [])

  const statItems = stats ? [
    { label: 'Anglers', value: stats.totalAnglers.toString(), icon: '👥' },
    { label: 'Catches', value: stats.totalCatches.toString(), icon: '🐟' },
    { label: 'Active Events', value: stats.activeCompetitions.toString(), icon: '🏆' },
    { label: 'Total Weight', value: `${stats.totalWeight.toFixed(1)} kg`, icon: '⚖️' },
  ] : []

  return (
    <div className="p-5 space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-angler-bg2 rounded-[14px] h-20 animate-pulse" />
          ))
        ) : (
          statItems.map((s) => (
            <div key={s.label} className="bg-angler-bg2 rounded-[14px] px-4 py-3.5">
              <span className="text-[20px] leading-none">{s.icon}</span>
              <p className="text-[26px] font-extrabold text-angler-teal leading-none mt-2 tabular-nums">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mt-1">{s.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Recent catches */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
          Recent Catches
        </p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-angler-bg2 rounded-[12px] h-14 animate-pulse" />
            ))}
          </div>
        ) : recentCatches.length === 0 ? (
          <p className="text-angler-text3 text-[13px] text-center py-8">No catches yet.</p>
        ) : (
          <div className="space-y-2">
            {recentCatches.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCatch(c)}
                className="w-full flex items-center gap-3 bg-angler-bg2 rounded-[12px] px-3 py-2.5 text-left"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: c.profiles?.avatar_color ?? '#d1d5db' }}
                >
                  {c.profiles?.avatar_emoji ?? '🎣'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-angler-text font-semibold text-[14px] leading-tight truncate">{c.species}</p>
                  <p className="text-angler-text3 text-[11px] mt-0.5 truncate">
                    {c.profiles?.username ?? 'Unknown'} · {format(new Date(c.timestamp), 'dd MMM HH:mm')}
                  </p>
                </div>
                <p className="text-angler-teal font-extrabold text-[15px] tabular-nums flex-shrink-0">
                  {c.weight_kg.toFixed(2)} kg
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        readOnly
      />
    </div>
  )
}

// ── Anglers ───────────────────────────────────────────────────────────────────

interface UserStats { catchCount: number; totalWeight: number }

function AnglersSection({ showToast }: { showToast: ShowToast }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [loading, setLoading] = useState(true)

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', username: '', password: '', role: 'angler' as 'angler' | 'admin' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copiedCreate, setCopiedCreate] = useState(false)

  // Edit
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({ username: '', avatar_emoji: '', avatar_color: '', role: 'angler' as 'angler' | 'admin' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null)
  const [copiedReset, setCopiedReset] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const anySheetOpen = showCreate || editUser !== null
  useEffect(() => {
    document.body.style.overflow = anySheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [anySheetOpen])

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const [profilesRes, catchesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('catches').select('angler_id, weight_kg'),
    ])
    if (profilesRes.data) setUsers(profilesRes.data as Profile[])
    if (catchesRes.data) {
      const stats: Record<string, UserStats> = {}
      for (const c of catchesRes.data) {
        if (!stats[c.angler_id]) stats[c.angler_id] = { catchCount: 0, totalWeight: 0 }
        stats[c.angler_id].catchCount++
        stats[c.angler_id].totalWeight += c.weight_kg ?? 0
      }
      setUserStats(stats)
    }
    setLoading(false)
  }

  function openEdit(u: Profile) {
    setEditUser(u)
    setEditForm({ username: u.username, avatar_emoji: u.avatar_emoji, avatar_color: u.avatar_color, role: u.role })
    setEditError(null)
    setResetPwdResult(null)
    setCopiedReset(false)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateError(null)
    setCreatedPassword(null)
    setCreateForm({ email: '', username: '', password: '', role: 'angler' })
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: createForm.email, username: createForm.username, temp_password: createForm.password, role: createForm.role },
    })
    if (error) { setCreateError(error.message ?? 'Failed to create user'); setCreateLoading(false); return }
    setCreatedPassword(createForm.password)
    setCreateLoading(false)
    await loadUsers()
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setEditLoading(true)
    setEditError(null)
    const { error } = await supabase.from('profiles').update({
      username: editForm.username, avatar_emoji: editForm.avatar_emoji,
      avatar_color: editForm.avatar_color, role: editForm.role,
    }).eq('id', editUser.id)
    if (error) { setEditError(error.message ?? 'Failed to save'); setEditLoading(false); return }
    setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...editForm } : u))
    setEditUser(null)
    setEditLoading(false)
    showToast('User updated')
  }

  async function handleResetPassword() {
    if (!editUser) return
    const pwd = generateTempPassword()
    setResetPwdResult(pwd)
    setCopiedReset(false)
    await supabase.from('profiles').update({ force_password_change: true }).eq('id', editUser.id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: deleteTarget.id } })
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      showToast(`Deleted ${deleteTarget.username}`)
    } else {
      showToast(error.message ?? 'Failed to delete', 'error')
    }
    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  async function copy(text: string, which: 'create' | 'reset') {
    await navigator.clipboard.writeText(text)
    if (which === 'create') { setCopiedCreate(true); setTimeout(() => setCopiedCreate(false), 2000) }
    else { setCopiedReset(true); setTimeout(() => setCopiedReset(false), 2000) }
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <button
        onClick={() => { setCreateForm({ email: '', username: '', password: '', role: 'angler' }); setCreateError(null); setCreatedPassword(null); setShowCreate(true) }}
        className="w-full flex items-center justify-center gap-2 bg-angler-teal text-white font-bold text-[15px] h-12 rounded-[12px]"
      >
        <span className="text-[18px] leading-none font-normal">+</span> Create Angler
      </button>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-angler-bg2 rounded-[14px] h-20 animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="text-angler-text3 text-[13px] text-center py-8">No users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const st = userStats[u.id] ?? { catchCount: 0, totalWeight: 0 }
            return (
              <div key={u.id} className="bg-angler-bg2 rounded-[14px] px-3 py-3 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: u.avatar_color }}
                >
                  {u.avatar_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-angler-text text-[14px] leading-tight truncate">{u.username}</p>
                    {u.role === 'admin' && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-angler-teal-l border border-angler-teal/30 text-angler-teal">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-angler-text3 text-[11px] mt-0.5">
                    {st.catchCount} catches · {st.totalWeight.toFixed(1)} kg · joined {format(new Date(u.created_at), 'MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="w-9 h-9 flex items-center justify-center text-angler-text3 hover:text-angler-text rounded-[8px] hover:bg-angler-white transition-colors min-h-[44px]"
                    aria-label="Edit"
                  >
                    <span className="text-[16px]">✏️</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="w-9 h-9 flex items-center justify-center text-angler-text3 hover:text-red-500 rounded-[8px] hover:bg-red-50 transition-colors min-h-[44px]"
                    aria-label="Delete"
                  >
                    <span className="text-[16px]">🗑️</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create sheet */}
      <AnimatePresence>
        {showCreate && (
          <Sheet title="Create Angler" onClose={closeCreate}>
            <div className="px-5 py-4">
              {createdPassword ? (
                <div className="space-y-4">
                  <div className="bg-angler-teal-l border border-angler-teal/30 rounded-[12px] p-4">
                    <p className="text-angler-teal font-semibold text-[14px]">Angler created!</p>
                    <p className="text-angler-text2 text-[13px] mt-1">Share this temporary password:</p>
                  </div>
                  <div>
                    <label className={LABEL}>Temporary Password</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 font-mono text-[16px] text-angler-text break-all">
                        {createdPassword}
                      </div>
                      <button onClick={() => copy(createdPassword, 'create')} className="w-12 h-12 flex items-center justify-center bg-angler-bg2 border border-angler-border rounded-[12px] text-[18px] flex-shrink-0">
                        {copiedCreate ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-[12px] p-3">
                    <p className="text-yellow-700 text-[13px] font-medium">⚠️ Share this securely — it won't be shown again.</p>
                  </div>
                  <button onClick={closeCreate} className="w-full h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px]">Done</button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className={LABEL}>Email *</label>
                    <input type="email" className={INPUT} placeholder="angler@example.com" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label className={LABEL}>Username *</label>
                    <input type="text" className={INPUT} placeholder="username" value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))} required />
                  </div>
                  <div>
                    <label className={LABEL}>Temporary Password *</label>
                    <div className="flex gap-2">
                      <input type="text" className={`${INPUT} flex-1`} placeholder="temp password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} required />
                      <button type="button" onClick={() => setCreateForm((f) => ({ ...f, password: generateTempPassword() }))} className="h-12 px-3 bg-angler-bg2 border border-angler-border rounded-[12px] text-angler-text2 font-semibold text-[13px] flex-shrink-0 min-h-[44px]">
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Role</label>
                    <select className={INPUT} value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as 'angler' | 'admin' }))}>
                      <option value="angler">Angler</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {createError && <p className="text-red-500 text-[13px]">{createError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeCreate} className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]">Cancel</button>
                    <button type="submit" disabled={createLoading} className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50">
                      {createLoading ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Edit sheet */}
      <AnimatePresence>
        {editUser && (
          <Sheet title="Edit Angler" onClose={() => setEditUser(null)}>
            <div className="px-5 py-4">
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className={LABEL}>Username *</label>
                  <input type="text" className={INPUT} value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} required />
                </div>
                <div>
                  <label className={LABEL}>Avatar Emoji</label>
                  <input type="text" className={INPUT} placeholder="e.g. 🎣" value={editForm.avatar_emoji} onChange={(e) => setEditForm((f) => ({ ...f, avatar_emoji: e.target.value }))} />
                  <p className="text-angler-text3 text-[12px] mt-1">Paste or type a single emoji</p>
                </div>
                <div>
                  <label className={LABEL}>Avatar Colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" className="w-12 h-12 rounded-[10px] border border-angler-border bg-angler-bg2 cursor-pointer" value={editForm.avatar_color} onChange={(e) => setEditForm((f) => ({ ...f, avatar_color: e.target.value }))} />
                    <span className="text-angler-text2 font-mono text-[14px]">{editForm.avatar_color}</span>
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Role</label>
                  <select className={INPUT} value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'angler' | 'admin' }))}>
                    <option value="angler">Angler</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {editError && <p className="text-red-500 text-[13px]">{editError}</p>}

                {/* Password reset */}
                <div className="border-t border-angler-border pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">Password Reset</p>
                  <button type="button" onClick={handleResetPassword} className="w-full h-11 bg-angler-bg2 border border-angler-border rounded-[12px] text-angler-text font-semibold text-[14px] min-h-[44px]">
                    🔑 Generate reset password
                  </button>
                  {resetPwdResult && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 font-mono text-[16px] text-angler-text break-all">
                          {resetPwdResult}
                        </div>
                        <button type="button" onClick={() => copy(resetPwdResult, 'reset')} className="w-12 h-12 flex items-center justify-center bg-angler-bg2 border border-angler-border rounded-[12px] text-[18px] flex-shrink-0 min-h-[44px]">
                          {copiedReset ? '✓' : '📋'}
                        </button>
                      </div>
                      <p className="text-yellow-700 text-[12px] bg-yellow-50 border border-yellow-200 rounded-[10px] p-2">
                        Update this user's password via Supabase Dashboard → Authentication → Users. Profile is flagged for forced change on next login.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 pb-[env(safe-area-inset-bottom,0)]">
                  <button type="button" onClick={() => setEditUser(null)} className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]">Cancel</button>
                  <button type="submit" disabled={editLoading} className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50">
                    {editLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <Confirm
            title="Delete Angler"
            body={<>This will permanently delete <strong>{deleteTarget.username}</strong> and all their catches. This cannot be undone.</>}
            confirmLabel="Delete"
            loading={deleteLoading}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Venues ────────────────────────────────────────────────────────────────────

interface VenueForm { name: string; location_text: string; size_description: string; fish_types: string; notes: string }
const BLANK_VENUE: VenueForm = { name: '', location_text: '', size_description: '', fish_types: '', notes: '' }

function VenuesSection({ showToast }: { showToast: ShowToast }) {
  const { venues, setVenues } = useStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<VenueForm>(BLANK_VENUE)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [editForm, setEditForm] = useState<VenueForm>(BLANK_VENUE)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<Venue | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const anySheetOpen = showCreate || editVenue !== null
  useEffect(() => {
    document.body.style.overflow = anySheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [anySheetOpen])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('venues').select('*').order('name', { ascending: true })
      if (data) setVenues(data as Venue[])
      setLoading(false)
    }
    load()
  }, [setVenues])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return venues
    return venues.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      (v.location_text ?? '').toLowerCase().includes(q) ||
      (v.fish_types ?? '').toLowerCase().includes(q)
    )
  }, [venues, search])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    const { data, error } = await supabase.from('venues').insert({
      name: createForm.name,
      location_text: createForm.location_text || null,
      size_description: createForm.size_description || null,
      fish_types: createForm.fish_types || null,
      notes: createForm.notes || null,
    }).select().single()
    setCreateLoading(false)
    if (error) { setCreateError(error.message); return }
    if (data) setVenues([...venues, data as Venue].sort((a, b) => a.name.localeCompare(b.name)))
    setShowCreate(false)
    setCreateForm(BLANK_VENUE)
    showToast('Venue created')
  }

  function openEdit(v: Venue) {
    setEditVenue(v)
    setEditForm({ name: v.name, location_text: v.location_text ?? '', size_description: v.size_description ?? '', fish_types: v.fish_types ?? '', notes: v.notes ?? '' })
    setEditError(null)
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault()
    if (!editVenue) return
    setEditLoading(true)
    setEditError(null)
    const { data, error } = await supabase.from('venues').update({
      name: editForm.name,
      location_text: editForm.location_text || null,
      size_description: editForm.size_description || null,
      fish_types: editForm.fish_types || null,
      notes: editForm.notes || null,
    }).eq('id', editVenue.id).select().single()
    setEditLoading(false)
    if (error) { setEditError(error.message); return }
    if (data) setVenues(venues.map((v) => v.id === editVenue.id ? (data as Venue) : v).sort((a, b) => a.name.localeCompare(b.name)))
    setEditVenue(null)
    showToast('Venue updated')
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return
    setDeleteLoading(true)
    const { error } = await supabase.from('venues').delete().eq('id', confirmDelete.id)
    setDeleteLoading(false)
    if (error) { showToast(error.message, 'error') }
    else { setVenues(venues.filter((v) => v.id !== confirmDelete.id)); showToast('Venue deleted') }
    setConfirmDelete(null)
  }

  function VenueFormFields({ form, setForm }: { form: VenueForm; setForm: (f: VenueForm) => void }) {
    return (
      <div className="space-y-4 px-5 py-4">
        <div><label className={LABEL}>Name *</label><input type="text" className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className={LABEL}>Location</label><input type="text" className={INPUT} placeholder="e.g. Retford, NG22 0AX" value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} /></div>
        <div><label className={LABEL}>Size</label><input type="text" className={INPUT} placeholder="e.g. 8+ lakes" value={form.size_description} onChange={(e) => setForm({ ...form, size_description: e.target.value })} /></div>
        <div><label className={LABEL}>Fish Types</label><input type="text" className={INPUT} placeholder="e.g. Carp, F1s, Silvers" value={form.fish_types} onChange={(e) => setForm({ ...form, fish_types: e.target.value })} /></div>
        <div><label className={LABEL}>Notes</label><textarea className={`${INPUT} resize-none`} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex gap-2">
        <input type="text" className={`${INPUT} flex-1`} placeholder="Search venues…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button
          onClick={() => { setCreateForm(BLANK_VENUE); setCreateError(null); setShowCreate(true) }}
          className="h-12 px-4 bg-angler-teal text-white font-bold text-[14px] rounded-[12px] flex-shrink-0 min-h-[44px]"
        >
          + Add
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-angler-bg2 rounded-[12px] h-14 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-angler-text3 text-[13px] text-center py-8">{venues.length === 0 ? 'No venues yet.' : 'No matches.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <div key={v.id} className="flex items-center gap-3 bg-angler-bg2 rounded-[12px] px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-angler-text text-[14px] leading-tight truncate">{v.name}</p>
                <p className="text-angler-text3 text-[11px] mt-0.5 truncate">
                  {[v.location_text, v.fish_types].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(v)} className="w-9 h-9 flex items-center justify-center text-angler-text3 hover:text-angler-text rounded-[8px] hover:bg-angler-white transition-colors min-h-[44px]" aria-label="Edit">
                  <span className="text-[15px]">✏️</span>
                </button>
                <button onClick={() => setConfirmDelete(v)} className="w-9 h-9 flex items-center justify-center text-angler-text3 hover:text-red-500 rounded-[8px] hover:bg-red-50 transition-colors min-h-[44px]" aria-label="Delete">
                  <span className="text-[15px]">🗑️</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create sheet */}
      <AnimatePresence>
        {showCreate && (
          <Sheet title="Add Venue" onClose={() => { setShowCreate(false); setCreateError(null) }}>
            <form onSubmit={handleCreate}>
              <VenueFormFields form={createForm} setForm={setCreateForm} />
              {createError && <p className="px-5 text-red-500 text-[13px]">{createError}</p>}
              <div className="flex gap-3 px-5 py-4 border-t border-angler-border">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]">Cancel</button>
                <button type="submit" disabled={createLoading} className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50">{createLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Edit sheet */}
      <AnimatePresence>
        {editVenue && (
          <Sheet title="Edit Venue" onClose={() => setEditVenue(null)}>
            <form onSubmit={handleEditSave}>
              <VenueFormFields form={editForm} setForm={setEditForm} />
              {editError && <p className="px-5 text-red-500 text-[13px]">{editError}</p>}
              <div className="flex gap-3 px-5 py-4 border-t border-angler-border">
                <button type="button" onClick={() => setEditVenue(null)} className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50">{editLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <Confirm
            title="Delete Venue"
            body={<>Delete <strong>{confirmDelete.name}</strong>? This will unlink the venue from any existing competitions and catches but won't delete them.</>}
            confirmLabel="Delete"
            loading={deleteLoading}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Achievements ──────────────────────────────────────────────────────────────

interface EarnedRow extends AchievementEarned {
  profiles?: { username: string; avatar_emoji: string; avatar_color: string }
}

const RARITY_COLOUR: Record<string, string> = {
  common: 'text-angler-text3',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500',
}

function AchievementsSection({ showToast }: { showToast: ShowToast }) {
  const [tab, setTab] = useState<'earned' | 'grant'>('earned')
  const [earned, setEarned] = useState<EarnedRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [anglerFilter, setAnglerFilter] = useState('')
  const [achievementFilter, setAchievementFilter] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<EarnedRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [grantAngler, setGrantAngler] = useState('')
  const [grantAchievement, setGrantAchievement] = useState('')
  const [anglerEarnedIds, setAnglerEarnedIds] = useState<string[]>([])
  const [grantLoading, setGrantLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('achievements_earned').select('*, profiles(username, avatar_emoji, avatar_color)').order('earned_at', { ascending: false }),
      supabase.from('profiles').select('*').order('username'),
    ]).then(([earnedRes, profilesRes]) => {
      if (earnedRes.data) setEarned(earnedRes.data as EarnedRow[])
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!grantAngler) { setAnglerEarnedIds([]); return }
    supabase.from('achievements_earned').select('achievement_id').eq('angler_id', grantAngler)
      .then(({ data }) => setAnglerEarnedIds(data?.map((r) => r.achievement_id) ?? []))
  }, [grantAngler])

  const filteredEarned = useMemo(() => earned.filter((r) => {
    if (anglerFilter && r.angler_id !== anglerFilter) return false
    if (achievementFilter && r.achievement_id !== achievementFilter) return false
    return true
  }), [earned, anglerFilter, achievementFilter])

  async function handleRevoke(row: EarnedRow) {
    setActionLoading(true)
    await supabase.from('achievements_earned').delete().eq('id', row.id)
    setEarned((prev) => prev.filter((r) => r.id !== row.id))
    setRevokeTarget(null)
    setActionLoading(false)
    showToast('Achievement revoked')
  }

  async function handleGrant() {
    if (!grantAngler || !grantAchievement) return
    setGrantLoading(true)
    const { data, error } = await supabase.from('achievements_earned').insert({
      angler_id: grantAngler, achievement_id: grantAchievement, earned_at: new Date().toISOString(),
    }).select('*, profiles(username, avatar_emoji, avatar_color)').single()
    setGrantLoading(false)
    if (error) { showToast(error.message || 'Failed to grant', 'error'); return }
    if (data) {
      setEarned((prev) => [data as EarnedRow, ...prev])
      setAnglerEarnedIds((prev) => [...prev, grantAchievement])
      const ach = ACHIEVEMENT_MAP[grantAchievement]
      showToast(`${ach?.icon ?? ''} ${ach?.name ?? 'Achievement'} granted!`)
      setGrantAchievement('')
    }
  }

  return (
    <div className="p-5 space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-1.5 bg-angler-bg2 rounded-[12px] p-1">
        {(['earned', 'grant'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-[10px] text-[13px] font-semibold transition-all ${
              tab === t ? 'bg-angler-white shadow-card-light text-angler-text' : 'text-angler-text2'
            }`}
          >
            {t === 'earned' ? '🎖 Earned' : '✨ Grant'}
          </button>
        ))}
      </div>

      {tab === 'earned' && (
        <>
          <div className="flex gap-2">
            <select className={`${INPUT} flex-1`} value={anglerFilter} onChange={(e) => setAnglerFilter(e.target.value)}>
              <option value="">All anglers</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.avatar_emoji} {p.username}</option>
              ))}
            </select>
            <select className={`${INPUT} flex-1`} value={achievementFilter} onChange={(e) => setAchievementFilter(e.target.value)}>
              <option value="">All</option>
              {ACHIEVEMENTS.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          <p className="text-angler-text3 text-[12px]">{filteredEarned.length} record{filteredEarned.length !== 1 ? 's' : ''}</p>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-angler-bg2 rounded-[12px] h-14 animate-pulse" />)}</div>
          ) : filteredEarned.length === 0 ? (
            <p className="text-angler-text3 text-[13px] text-center py-8">No achievements found.</p>
          ) : (
            <div className="space-y-2">
              {filteredEarned.map((row) => {
                const ach = ACHIEVEMENT_MAP[row.achievement_id]
                return (
                  <div key={row.id} className="flex items-center gap-3 bg-angler-bg2 rounded-[12px] px-3 py-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: row.profiles?.avatar_color ? `${row.profiles.avatar_color}33` : '#e5e7eb' }}>
                      {row.profiles?.avatar_emoji ?? '🎣'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-angler-text text-[14px] leading-tight truncate">{row.profiles?.username ?? '—'}</p>
                      <p className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{ach?.icon}</span>
                        <span className="text-angler-text2">{ach?.name ?? row.achievement_id}</span>
                        {ach && <span className={`font-bold capitalize ${RARITY_COLOUR[ach.rarity]}`}>{ach.rarity}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-angler-text3 text-[11px]">{format(new Date(row.earned_at), 'dd MMM yyyy')}</p>
                      <button onClick={() => setRevokeTarget(row)} className="text-red-500 text-[12px] font-semibold mt-0.5 min-h-[44px]">Revoke</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'grant' && (
        <div className="bg-angler-bg2 rounded-[14px] p-4 space-y-4">
          <h3 className="font-bold text-angler-text text-[15px]">Grant Achievement</h3>
          <div>
            <label className={LABEL}>Angler</label>
            <select className={INPUT} value={grantAngler} onChange={(e) => { setGrantAngler(e.target.value); setGrantAchievement('') }}>
              <option value="">Select angler…</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.avatar_emoji} {p.username}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Achievement</label>
            <select className={INPUT} value={grantAchievement} onChange={(e) => setGrantAchievement(e.target.value)} disabled={!grantAngler}>
              <option value="">Select achievement…</option>
              {ACHIEVEMENTS.map((a) => {
                const already = anglerEarnedIds.includes(a.id)
                return <option key={a.id} value={a.id} disabled={already}>{a.icon} {a.name} {already ? '(earned)' : `· ${a.rarity}`}</option>
              })}
            </select>
          </div>
          <button
            onClick={handleGrant}
            disabled={!grantAngler || !grantAchievement || grantLoading}
            className="w-full h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50"
          >
            {grantLoading ? 'Granting…' : '✨ Grant Achievement'}
          </button>
        </div>
      )}

      {/* Revoke confirm */}
      <AnimatePresence>
        {revokeTarget && (
          <Confirm
            title="Revoke Achievement"
            body={<>Remove <strong>{ACHIEVEMENT_MAP[revokeTarget.achievement_id]?.name}</strong> from <strong>{revokeTarget.profiles?.username}</strong>?</>}
            confirmLabel="Revoke"
            loading={actionLoading}
            onConfirm={() => handleRevoke(revokeTarget)}
            onCancel={() => setRevokeTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Catches ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

function CatchesSection({ showToast }: { showToast: ShowToast }) {
  const storeVenues = useStore((s) => s.venues)
  const [catches, setCatches] = useState<Catch[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const allFetchedRef = useRef<Catch[]>([])

  // Filters
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [anglerFilter, setAnglerFilter] = useState('')
  const [competitionFilter, setCompetitionFilter] = useState('')
  const [venueFilter, setVenueFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  // Single delete
  const [deleteTarget, setDeleteTarget] = useState<Catch | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // View catch
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)

  // suppress unused-prop warning
  void showToast

  useEffect(() => {
    loadCatches(1)
    supabase.from('competitions').select('id, name').order('name').then(({ data }) => {
      if (data) setCompetitions(data as Competition[])
    })
  }, [])

  async function loadCatches(pageNum: number) {
    if (pageNum === 1) setLoading(true)
    const from = (pageNum - 1) * PAGE_SIZE
    const { data } = await supabase
      .from('catches')
      .select('*, profiles(username, avatar_emoji, avatar_color)')
      .order('timestamp', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (data) {
      if (pageNum === 1) { allFetchedRef.current = data as Catch[]; setCatches(data as Catch[]) }
      else { allFetchedRef.current = [...allFetchedRef.current, ...(data as Catch[])]; setCatches(allFetchedRef.current) }
      setHasMore(data.length === PAGE_SIZE)
      setPage(pageNum)
    }
    setLoading(false)
  }

  const uniqueAnglers = useMemo(() =>
    Array.from(new Map(catches.filter((c) => c.profiles?.username).map((c) => [c.angler_id, c.profiles!.username])).entries()),
    [catches]
  )

  const filtered = useMemo(() => catches.filter((c) => {
    if (speciesFilter === '__other__') {
      const knownNames = new Set(SPECIES.map((s) => s.name))
      if (knownNames.has(c.species)) return false
    } else if (speciesFilter && c.species !== speciesFilter) return false
    if (anglerFilter && c.angler_id !== anglerFilter) return false
    if (competitionFilter) {
      if (competitionFilter === '__none__' && c.competition_id !== null) return false
      if (competitionFilter !== '__none__' && c.competition_id !== competitionFilter) return false
    }
    if (venueFilter && c.venue_id !== venueFilter) return false
    if (dateFrom && new Date(c.timestamp) < new Date(dateFrom)) return false
    if (dateTo && new Date(c.timestamp) > new Date(dateTo + 'T23:59:59')) return false
    return true
  }), [catches, speciesFilter, anglerFilter, competitionFilter, venueFilter, dateFrom, dateTo])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)))
  }

  async function handleBulkDelete() {
    setBulkDeleteLoading(true)
    const ids = Array.from(selectedIds)
    await supabase.from('catches').delete().in('id', ids)
    const gone = new Set(ids)
    allFetchedRef.current = allFetchedRef.current.filter((c) => !gone.has(c.id))
    setCatches(allFetchedRef.current)
    setSelectedIds(new Set())
    setBulkDeleteLoading(false)
    setConfirmBulkDelete(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await supabase.from('catches').delete().eq('id', deleteTarget.id)
    allFetchedRef.current = allFetchedRef.current.filter((c) => c.id !== deleteTarget.id)
    setCatches(allFetchedRef.current)
    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  const compName = (id: string | null) => id ? (competitions.find((c) => c.id === id)?.name ?? 'Unknown') : '—'
  const hasFilters = speciesFilter || anglerFilter || competitionFilter || venueFilter || dateFrom || dateTo

  return (
    <div className="p-5 space-y-4">
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <select className={`${INPUT} flex-1`} value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
            <option value="">All species</option>
            <optgroup label="Coarse">
              {SPECIES.filter((s) => s.category === 'coarse').map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </optgroup>
            <optgroup label="Game">
              {SPECIES.filter((s) => s.category === 'game').map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </optgroup>
            <optgroup label="Sea">
              {SPECIES.filter((s) => s.category === 'sea').map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </optgroup>
            <option value="__other__">Other (custom species)</option>
          </select>
          <select className={`${INPUT} flex-1`} value={anglerFilter} onChange={(e) => setAnglerFilter(e.target.value)}>
            <option value="">All Anglers</option>
            {uniqueAnglers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <select className={`${INPUT} flex-1`} value={competitionFilter} onChange={(e) => setCompetitionFilter(e.target.value)}>
            <option value="">All Competitions</option>
            <option value="__none__">No Competition</option>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={`${INPUT} flex-1`} value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
            <option value="">All Venues</option>
            {storeVenues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className={LABEL}>From</label>
            <input type="date" className={INPUT} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="dd/mm/yyyy" />
          </div>
          <div className="flex-1">
            <label className={LABEL}>To</label>
            <input type="date" className={INPUT} value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="dd/mm/yyyy" />
          </div>
          {hasFilters && (
            <button onClick={() => { setSpeciesFilter(''); setAnglerFilter(''); setCompetitionFilter(''); setVenueFilter(''); setDateFrom(''); setDateTo('') }} className="h-12 px-3 bg-angler-bg2 border border-angler-border rounded-[12px] text-angler-text2 font-semibold text-[13px] flex-shrink-0 min-h-[44px]">
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-angler-text3 text-[12px]">
        {filtered.length} catch{filtered.length !== 1 ? 'es' : ''}
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-angler-bg2 rounded-[12px] h-16 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-angler-text3 text-[13px] text-center py-8">No catches found.</p>
      ) : (
        <>
          {/* Select all row */}
          <label className="flex items-center gap-3 px-3 py-2 cursor-pointer min-h-[44px]">
            <input type="checkbox" className="w-4 h-4 accent-teal" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
            <span className="text-angler-text2 text-[13px] font-semibold">Select all ({filtered.length})</span>
          </label>

          {/* Catch rows */}
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className={`flex items-center gap-2 rounded-[12px] px-3 py-2.5 border transition-colors ${selectedIds.has(c.id) ? 'bg-angler-teal-l border-angler-teal/30' : 'bg-angler-bg2 border-transparent'}`}>
                <input type="checkbox" className="w-4 h-4 accent-teal flex-shrink-0" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: c.profiles?.avatar_color ?? '#d1d5db' }}
                >
                  {c.profiles?.avatar_emoji ?? '🎣'}
                </div>
                <button onClick={() => setSelectedCatch(c)} className="flex-1 min-w-0 text-left">
                  <p className="text-angler-text font-semibold text-[13px] leading-tight truncate">{c.species} · <span className="text-angler-teal">{c.weight_kg.toFixed(2)} kg</span></p>
                  <p className="text-angler-text3 text-[11px] mt-0.5 truncate">
                    {c.profiles?.username ?? '—'} · {format(new Date(c.timestamp), 'dd MMM yy')}
                    {c.competition_id ? ` · ${compName(c.competition_id)}` : ''}
                  </p>
                </button>
                <button onClick={() => setDeleteTarget(c)} className="w-8 h-8 flex items-center justify-center text-angler-text3 hover:text-red-500 transition-colors flex-shrink-0 min-h-[44px]" aria-label="Delete">
                  <span className="text-[14px]">🗑️</span>
                </button>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <button onClick={() => loadCatches(page + 1)} className="w-full h-11 bg-angler-bg2 border border-angler-border rounded-[12px] text-angler-text2 font-semibold text-[14px]">
              Load more
            </button>
          )}
        </>
      )}

      {/* Bulk delete bar — sits above BottomNav */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-40"
          >
            <div className="bg-angler-white border border-angler-border rounded-[14px] shadow-elevated-light px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-angler-text font-semibold text-[14px]">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="h-9 px-3 bg-angler-bg2 border border-angler-border rounded-[10px] text-angler-text2 font-semibold text-[13px]">Clear</button>
                <button onClick={() => setConfirmBulkDelete(true)} className="h-9 px-3 bg-red-500 text-white rounded-[10px] font-bold text-[13px]">Delete ({selectedIds.size})</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete confirm */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <Confirm
            title="Delete Catches"
            body={<>This will permanently delete <strong>{selectedIds.size}</strong> catch{selectedIds.size !== 1 ? 'es' : ''}. This cannot be undone.</>}
            confirmLabel={`Delete ${selectedIds.size}`}
            loading={bulkDeleteLoading}
            onConfirm={handleBulkDelete}
            onCancel={() => setConfirmBulkDelete(false)}
          />
        )}
      </AnimatePresence>

      {/* Single delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <Confirm
            title="Delete Catch"
            body={<>Delete <strong>{deleteTarget.species} ({deleteTarget.weight_kg.toFixed(2)} kg)</strong> by {deleteTarget.profiles?.username ?? 'Unknown'}? This cannot be undone.</>}
            confirmLabel="Delete"
            loading={deleteLoading}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        readOnly
      />
    </div>
  )
}

// ── Main Settings page ────────────────────────────────────────────────────────

export function Settings() {
  const profile = useStore((s) => s.profile)

  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    setToast({ msg, kind })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-8 space-y-4">
      <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
        Admin Settings
      </h1>

      <SectionCard icon="🏠" title="App Overview" defaultOpen>
        <OverviewSection showToast={showToast} />
      </SectionCard>

      <SectionCard icon="👥" title="Anglers">
        <AnglersSection showToast={showToast} />
      </SectionCard>

      <SectionCard icon="📍" title="Venues">
        <VenuesSection showToast={showToast} />
      </SectionCard>

      <SectionCard icon="🎖️" title="Achievements">
        <AchievementsSection showToast={showToast} />
      </SectionCard>

      <SectionCard icon="🐟" title="Catches">
        <CatchesSection showToast={showToast} />
      </SectionCard>

      <ToastBanner toast={toast} />
    </div>
  )
}
