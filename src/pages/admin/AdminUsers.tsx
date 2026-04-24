import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { generateTempPassword } from '@/lib/supabase'
import type { Profile } from '@/types'

interface UserStats {
  catchCount: number
  totalWeight: number
}

type DrawerMode = 'create' | 'edit' | null

interface CreateForm {
  email: string
  username: string
  password: string
  role: 'angler' | 'admin'
}

interface EditForm {
  username: string
  avatar_emoji: string
  avatar_color: string
  role: 'angler' | 'admin'
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-40"
      onClick={onClick}
    />
  )
}

export function AdminUsers() {
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState<Profile[]>([])
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [loading, setLoading] = useState(true)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState<CreateForm>({
    email: '',
    username: '',
    password: '',
    role: 'angler',
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copiedCreate, setCopiedCreate] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState<EditForm>({
    username: '',
    avatar_emoji: '',
    avatar_color: '',
    role: 'angler',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null)
  const [copiedReset, setCopiedReset] = useState(false)

  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      if (searchParams.get('create') === 'true') {
        setDrawerMode('create')
      }
    }
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profiles) {
      setUsers(profiles as Profile[])
    }

    // Fetch all catches to compute per-user stats
    const { data: catches } = await supabase.from('catches').select('angler_id, weight_kg')
    if (catches) {
      const stats: Record<string, UserStats> = {}
      for (const c of catches) {
        if (!stats[c.angler_id]) stats[c.angler_id] = { catchCount: 0, totalWeight: 0 }
        stats[c.angler_id].catchCount += 1
        stats[c.angler_id].totalWeight += c.weight_kg ?? 0
      }
      setUserStats(stats)
    }

    setLoading(false)
  }

  function openCreate() {
    setCreateForm({ email: '', username: '', password: '', role: 'angler' })
    setCreateError(null)
    setCreatedPassword(null)
    setDrawerMode('create')
  }

  function openEdit(user: Profile) {
    setSelectedUser(user)
    setEditForm({
      username: user.username,
      avatar_emoji: user.avatar_emoji,
      avatar_color: user.avatar_color,
      role: user.role,
    })
    setEditError(null)
    setResetPwdResult(null)
    setDrawerMode('edit')
  }

  function closeDrawer() {
    setDrawerMode(null)
    setSelectedUser(null)
    setCreatedPassword(null)
    setResetPwdResult(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: createForm.email,
        username: createForm.username,
        temp_password: createForm.password,
        role: createForm.role,
      },
    })

    if (error) {
      setCreateError(error.message ?? 'Failed to create user')
      setCreateLoading(false)
      return
    }

    setCreatedPassword(createForm.password)
    setCreateLoading(false)
    await loadUsers()
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setEditLoading(true)
    setEditError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        username: editForm.username,
        avatar_emoji: editForm.avatar_emoji,
        avatar_color: editForm.avatar_color,
        role: editForm.role,
      })
      .eq('id', selectedUser.id)

    if (error) {
      setEditError(error.message ?? 'Failed to update user')
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, ...editForm } : u
        )
      )
      closeDrawer()
    }

    setEditLoading(false)
  }

  async function handleResetPassword() {
    if (!selectedUser) return
    const newPwd = generateTempPassword()
    setResetPwdResult(newPwd)
    setCopiedReset(false)

    // Mark force_password_change on their profile
    await supabase
      .from('profiles')
      .update({ force_password_change: true })
      .eq('id', selectedUser.id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)

    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId: deleteTarget.id },
    })

    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    }

    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  async function copyToClipboard(text: string, which: 'create' | 'reset') {
    await navigator.clipboard.writeText(text)
    if (which === 'create') {
      setCopiedCreate(true)
      setTimeout(() => setCopiedCreate(false), 2000)
    } else {
      setCopiedReset(true)
      setTimeout(() => setCopiedReset(false), 2000)
    }
  }

  const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: 0 },
    exit: { x: '100%' },
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-admin-text">Users</h1>
        <button onClick={openCreate} className="btn-primary">
          <span>+</span>
          Create User
        </button>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-admin-bg3 shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 w-28 bg-admin-bg3 rounded mb-2" />
                <div className="h-3 w-20 bg-admin-bg3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">User</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Role</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Catches</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Weight (kg)</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Joined</th>
                  <th className="text-right text-admin-text3 font-medium py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const stats = userStats[user.id] ?? { catchCount: 0, totalWeight: 0 }
                  return (
                    <tr key={user.id} className="border-b border-admin-border/50 hover:bg-admin-bg3 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                            style={{ backgroundColor: user.avatar_color }}
                          >
                            {user.avatar_emoji}
                          </div>
                          <span className="font-semibold text-admin-text">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {user.role === 'admin' ? (
                          <span className="badge-live">Admin</span>
                        ) : (
                          <span className="text-admin-text2 text-xs font-medium">Angler</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-admin-text">{stats.catchCount}</td>
                      <td className="py-3 px-2 text-admin-text">{stats.totalWeight.toFixed(1)}</td>
                      <td className="py-3 px-2 text-admin-text2">
                        {format(new Date(user.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-admin-bg3 text-admin-text2 hover:text-admin-text transition-colors"
                            title="Edit"
                          >
                            🖊
                          </button>
                          <button
                            onClick={() => {
                              openEdit(user)
                              setTimeout(() => handleResetPassword(), 100)
                            }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-admin-bg3 text-admin-text2 hover:text-admin-text transition-colors"
                            title="Reset Password"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-500/10 text-admin-text3 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {users.map((user) => {
              const stats = userStats[user.id] ?? { catchCount: 0, totalWeight: 0 }
              return (
                <div key={user.id} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: user.avatar_color }}
                    >
                      {user.avatar_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-admin-text truncate">{user.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {user.role === 'admin' ? (
                          <span className="badge-live">Admin</span>
                        ) : (
                          <span className="text-admin-text3 text-xs">Angler</span>
                        )}
                        <span className="text-admin-text3 text-xs">
                          · joined {format(new Date(user.created_at), 'MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-admin-text font-semibold">{stats.catchCount}</p>
                      <p className="text-admin-text3 text-xs">catches</p>
                    </div>
                    <div>
                      <p className="text-admin-text font-semibold">{stats.totalWeight.toFixed(1)}</p>
                      <p className="text-admin-text3 text-xs">kg</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="btn-ghost text-sm py-2 px-3 flex-1"
                    >
                      🖊 Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="btn-danger text-sm py-2 px-3"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Drawers */}
      <AnimatePresence>
        {drawerMode !== null && (
          <>
            <Backdrop onClick={closeDrawer} />
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-admin-bg2 border-l border-admin-border z-50 overflow-y-auto"
            >
              {drawerMode === 'create' && (
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-admin-text">Create User</h2>
                    <button
                      onClick={closeDrawer}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text hover:bg-admin-bg3 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {createdPassword ? (
                    <div className="flex flex-col gap-4">
                      <div className="bg-admin-teal/10 border border-admin-teal/30 rounded-xl p-4">
                        <p className="text-admin-teal font-semibold mb-1">User created!</p>
                        <p className="text-admin-text2 text-sm">Share the temp password below:</p>
                      </div>
                      <div>
                        <label className="label">Temporary Password</label>
                        <div className="flex gap-2">
                          <div className="bg-admin-bg3 border border-admin-teal/30 rounded-xl p-3 font-mono text-admin-text flex-1 text-sm break-all">
                            {createdPassword}
                          </div>
                          <button
                            onClick={() => copyToClipboard(createdPassword, 'create')}
                            className="btn-ghost px-3 shrink-0"
                          >
                            {copiedCreate ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                        <p className="text-yellow-400 text-sm font-medium">
                          ⚠️ Share this password securely — it won't be shown again.
                        </p>
                      </div>
                      <button onClick={closeDrawer} className="btn-primary w-full mt-2">
                        Done
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreate} className="flex flex-col gap-4 flex-1">
                      <div>
                        <label className="label">Email</label>
                        <input
                          type="email"
                          className="input"
                          placeholder="angler@example.com"
                          value={createForm.email}
                          onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Username</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="username"
                          value={createForm.username}
                          onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Temporary Password</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input flex-1"
                            placeholder="temp password"
                            value={createForm.password}
                            onChange={(e) =>
                              setCreateForm((f) => ({ ...f, password: e.target.value }))
                            }
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCreateForm((f) => ({ ...f, password: generateTempPassword() }))
                            }
                            className="btn-ghost px-3 shrink-0 text-sm"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label">Role</label>
                        <select
                          className="input"
                          value={createForm.role}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              role: e.target.value as 'angler' | 'admin',
                            }))
                          }
                        >
                          <option value="angler">Angler</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {createError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-red-400 text-sm">{createError}</p>
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={closeDrawer}
                          className="btn-ghost flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={createLoading}
                          className="btn-primary flex-1"
                        >
                          {createLoading ? 'Creating…' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {drawerMode === 'edit' && selectedUser && (
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-admin-text">Edit User</h2>
                    <button
                      onClick={closeDrawer}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text hover:bg-admin-bg3 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleEdit} className="flex flex-col gap-4 flex-1">
                    <div>
                      <label className="label">Username</label>
                      <input
                        type="text"
                        className="input"
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, username: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Avatar Emoji</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. 🎣"
                        value={editForm.avatar_emoji}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, avatar_emoji: e.target.value }))
                        }
                      />
                      <p className="text-admin-text3 text-xs mt-1">
                        Paste or type a single emoji
                      </p>
                    </div>
                    <div>
                      <label className="label">Avatar Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          className="w-12 h-12 rounded-xl border border-admin-border bg-admin-bg3 cursor-pointer"
                          value={editForm.avatar_color}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, avatar_color: e.target.value }))
                          }
                        />
                        <span className="text-admin-text2 text-sm font-mono">
                          {editForm.avatar_color}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select
                        className="input"
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            role: e.target.value as 'angler' | 'admin',
                          }))
                        }
                      >
                        <option value="angler">Angler</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {editError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <p className="text-red-400 text-sm">{editError}</p>
                      </div>
                    )}

                    {/* Reset password section */}
                    <div className="border-t border-admin-border pt-4">
                      <p className="text-admin-text2 text-sm mb-3">Password Reset</p>
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="btn-ghost w-full text-sm"
                      >
                        🔑 Generate Reset Password
                      </button>

                      {resetPwdResult && (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="bg-admin-bg3 border border-admin-teal/30 rounded-xl p-3 font-mono text-admin-text flex-1 text-sm break-all">
                              {resetPwdResult}
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(resetPwdResult, 'reset')}
                              className="btn-ghost px-3 shrink-0"
                            >
                              {copiedReset ? '✓' : '📋'}
                            </button>
                          </div>
                          <p className="text-yellow-400/80 text-xs">
                            Update this user's password via Supabase Dashboard → Authentication → Users. Profile flagged for forced password change.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={closeDrawer}
                        className="btn-ghost flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading}
                        className="btn-primary flex-1"
                      >
                        {editLoading ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <Backdrop onClick={() => setDeleteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Delete User</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  This will permanently delete{' '}
                  <span className="text-admin-text font-semibold">{deleteTarget.username}</span> and
                  all their catches. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="btn-danger flex-1"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
