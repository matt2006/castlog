import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import type { Competition, Profile } from '@/types'

interface MemberEntry {
  angler_id: string
  joined_at: string
  profiles?: Profile
}

interface CompetitionDetail {
  members: MemberEntry[]
  catchCount: number
}

interface CreateForm {
  name: string
  description: string
  start_time: string
  end_time: string
}

interface ConfirmRemoveState {
  compId: string
  anglerId: string
  username: string
}

interface ToastState {
  message: string
  kind: 'success' | 'error'
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

function toLocalDatetimeValue(isoString: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminCompetitions() {
  const [searchParams] = useSearchParams()
  const session = useStore((s) => s.session)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, CompetitionDetail>>({})
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const hasMounted = useRef(false)

  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit state per competition
  const [editForms, setEditForms] = useState<Record<string, Partial<Competition>>>({})
  const [editLoading, setEditLoading] = useState<string | null>(null)

  // Delete/reset confirmation state
  const [confirmReset, setConfirmReset] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Add-member state
  const [addMemberCompId, setAddMemberCompId] = useState<string | null>(null)
  const [addableUsers, setAddableUsers] = useState<Profile[]>([])
  const [addableLoading, setAddableLoading] = useState(false)
  const [addableSearch, setAddableSearch] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [addSubmitLoading, setAddSubmitLoading] = useState(false)

  // Remove-member confirmation
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<ConfirmRemoveState | null>(null)
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      if (searchParams.get('create') === 'true') {
        setShowCreateDrawer(true)
      }
    }
    loadCompetitions()
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string, kind: ToastState['kind'] = 'success') {
    setToast({ message, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function loadCompetitions() {
    setLoading(true)
    const [compsRes, membersRes] = await Promise.all([
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('competition_members').select('competition_id'),
    ])
    if (compsRes.data) setCompetitions(compsRes.data as Competition[])
    if (membersRes.data) {
      const counts: Record<string, number> = {}
      for (const row of membersRes.data as { competition_id: string }[]) {
        counts[row.competition_id] = (counts[row.competition_id] ?? 0) + 1
      }
      setMemberCounts(counts)
    }
    setLoading(false)
  }

  async function loadDetail(compId: string) {
    const [membersRes, catchesRes] = await Promise.all([
      supabase
        .from('competition_members')
        .select('angler_id, joined_at, profiles(id, username, avatar_emoji, avatar_color, role, force_password_change, created_at)')
        .eq('competition_id', compId),
      supabase
        .from('catches')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', compId),
    ])
    const members = (membersRes.data ?? []) as unknown as MemberEntry[]
    setDetails((prev) => ({
      ...prev,
      [compId]: {
        members,
        catchCount: catchesRes.count ?? 0,
      },
    }))
    setMemberCounts((prev) => ({ ...prev, [compId]: members.length }))
  }

  function toggleExpand(compId: string) {
    if (expandedId === compId) {
      setExpandedId(null)
      return
    }
    setExpandedId(compId)
    if (!details[compId]) {
      loadDetail(compId)
    }
    // Seed edit form
    const comp = competitions.find((c) => c.id === compId)
    if (comp && !editForms[compId]) {
      setEditForms((prev) => ({
        ...prev,
        [compId]: {
          name: comp.name,
          description: comp.description ?? '',
          start_time: comp.start_time,
          end_time: comp.end_time ?? '',
        },
      }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user) return
    setCreateLoading(true)
    setCreateError(null)

    const { data, error } = await supabase
      .from('competitions')
      .insert({
        name: createForm.name,
        description: createForm.description || null,
        start_time: createForm.start_time,
        end_time: createForm.end_time || null,
        status: 'upcoming',
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      setCreateError(error.message)
      setCreateLoading(false)
      return
    }

    if (data) setCompetitions((prev) => [data as Competition, ...prev])
    setCreateLoading(false)
    setShowCreateDrawer(false)
    setCreateForm({ name: '', description: '', start_time: '', end_time: '' })
  }

  async function handleEditSave(compId: string) {
    const form = editForms[compId]
    if (!form) return
    setEditLoading(compId)

    const { data, error } = await supabase
      .from('competitions')
      .update({
        name: form.name,
        description: form.description || null,
        start_time: form.start_time,
        end_time: form.end_time || null,
      })
      .eq('id', compId)
      .select()
      .single()

    if (!error && data) {
      setCompetitions((prev) =>
        prev.map((c) => (c.id === compId ? (data as Competition) : c))
      )
    }
    setEditLoading(null)
  }

  async function handleStatusChange(
    compId: string,
    status: 'upcoming' | 'live' | 'ended'
  ) {
    const { data } = await supabase
      .from('competitions')
      .update({ status })
      .eq('id', compId)
      .select()
      .single()
    if (data) {
      setCompetitions((prev) =>
        prev.map((c) => (c.id === compId ? (data as Competition) : c))
      )
    }
  }

  async function handleResetConfirm(compId: string) {
    setActionLoading(true)
    await supabase.from('catches').delete().eq('competition_id', compId)
    setActionLoading(false)
    setConfirmReset(null)
    loadDetail(compId)
  }

  async function handleDeleteConfirm(compId: string) {
    setActionLoading(true)
    await supabase.from('competitions').delete().eq('id', compId)
    setCompetitions((prev) => prev.filter((c) => c.id !== compId))
    setMemberCounts((prev) => {
      const next = { ...prev }
      delete next[compId]
      return next
    })
    setActionLoading(false)
    setConfirmDelete(null)
    if (expandedId === compId) setExpandedId(null)
  }

  async function openAddMember(compId: string) {
    setAddMemberCompId(compId)
    setAddableSearch('')
    setSelectedToAdd(new Set())
    setAddableLoading(true)

    // Ensure we have fresh member list for this comp
    const detail = details[compId]
    const existingIds = new Set((detail?.members ?? []).map((m) => m.angler_id))

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true })

    const profiles = (data ?? []) as Profile[]
    setAddableUsers(profiles.filter((p) => !existingIds.has(p.id)))
    setAddableLoading(false)
  }

  const filteredAddableUsers = useMemo(() => {
    const q = addableSearch.trim().toLowerCase()
    if (!q) return addableUsers
    return addableUsers.filter((u) => u.username.toLowerCase().includes(q))
  }, [addableUsers, addableSearch])

  function toggleSelectToAdd(userId: string) {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleAddSelected() {
    if (!addMemberCompId || selectedToAdd.size === 0) return
    const compId = addMemberCompId
    const ids = Array.from(selectedToAdd)
    setAddSubmitLoading(true)

    const rows = ids.map((angler_id) => ({ competition_id: compId, angler_id }))
    const { error } = await supabase.from('competition_members').insert(rows)
    setAddSubmitLoading(false)

    if (error) {
      showToast(error.message || 'Failed to add members', 'error')
      return
    }

    setAddMemberCompId(null)
    setSelectedToAdd(new Set())
    await loadDetail(compId)
    showToast(`Added ${ids.length} member${ids.length === 1 ? '' : 's'}`)
  }

  async function handleRemoveMemberConfirm() {
    if (!confirmRemoveMember) return
    const { compId, anglerId, username } = confirmRemoveMember
    setRemoveMemberLoading(true)

    const { error } = await supabase
      .from('competition_members')
      .delete()
      .eq('competition_id', compId)
      .eq('angler_id', anglerId)

    setRemoveMemberLoading(false)

    if (error) {
      showToast(error.message || 'Failed to remove member', 'error')
      return
    }

    setDetails((prev) => {
      const existing = prev[compId]
      if (!existing) return prev
      return {
        ...prev,
        [compId]: {
          ...existing,
          members: existing.members.filter((m) => m.angler_id !== anglerId),
        },
      }
    })
    setMemberCounts((prev) => ({
      ...prev,
      [compId]: Math.max(0, (prev[compId] ?? 1) - 1),
    }))
    setConfirmRemoveMember(null)
    showToast(`Removed ${username}`)
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const statusBadge = (status: Competition['status']) => {
    if (status === 'live') return <span className="badge-live">Live</span>
    if (status === 'upcoming') return <span className="badge-upcoming">Upcoming</span>
    return <span className="badge-ended">Ended</span>
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-admin-text">Competitions</h1>
        <button onClick={() => setShowCreateDrawer(true)} className="btn-primary">
          <span>+</span>
          Create
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      ) : competitions.length === 0 ? (
        <div className="card text-center text-admin-text3 py-12">No competitions yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {competitions.map((comp) => {
            const isExpanded = expandedId === comp.id
            const detail = details[comp.id]
            const form = editForms[comp.id] ?? {}
            const memberCount = memberCounts[comp.id] ?? 0

            return (
              <div key={comp.id} className="card overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => toggleExpand(comp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {statusBadge(comp.status)}
                      <h3 className="font-bold text-admin-text text-sm">{comp.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-admin-text3">
                      <span>
                        Code:{' '}
                        <span className="font-mono bg-admin-bg3 px-2 py-0.5 rounded text-admin-text2">
                          {comp.join_code}
                        </span>
                      </span>
                      <span>
                        {format(new Date(comp.start_time), 'dd MMM yyyy')}
                        {comp.end_time && ` → ${format(new Date(comp.end_time), 'dd MMM yyyy')}`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        👥 <span className="text-admin-text2 tabular-nums">{memberCount}</span>
                        <span className="sr-only"> members</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-admin-text3 text-xs mt-1 shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded panel */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-admin-border mt-4 pt-4 flex flex-col gap-5">
                        {/* Edit form */}
                        <div>
                          <p className="section-title">Edit Details</p>
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="label">Name</label>
                              <input
                                type="text"
                                className="input"
                                value={form.name ?? ''}
                                onChange={(e) =>
                                  setEditForms((prev) => ({
                                    ...prev,
                                    [comp.id]: { ...prev[comp.id], name: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="label">Description</label>
                              <textarea
                                className="input resize-none"
                                rows={2}
                                value={form.description ?? ''}
                                onChange={(e) =>
                                  setEditForms((prev) => ({
                                    ...prev,
                                    [comp.id]: {
                                      ...prev[comp.id],
                                      description: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label">Start</label>
                                <input
                                  type="datetime-local"
                                  className="input"
                                  value={toLocalDatetimeValue(form.start_time ?? '')}
                                  onChange={(e) =>
                                    setEditForms((prev) => ({
                                      ...prev,
                                      [comp.id]: {
                                        ...prev[comp.id],
                                        start_time: new Date(e.target.value).toISOString(),
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="label">End (optional)</label>
                                <input
                                  type="datetime-local"
                                  className="input"
                                  value={toLocalDatetimeValue(form.end_time ?? '')}
                                  onChange={(e) =>
                                    setEditForms((prev) => ({
                                      ...prev,
                                      [comp.id]: {
                                        ...prev[comp.id],
                                        end_time: e.target.value
                                          ? new Date(e.target.value).toISOString()
                                          : '',
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditSave(comp.id)}
                              disabled={editLoading === comp.id}
                              className="btn-primary self-start"
                            >
                              {editLoading === comp.id ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>

                        {/* Status controls */}
                        <div>
                          <p className="section-title">Status</p>
                          <div className="flex flex-wrap gap-2">
                            {(['upcoming', 'live', 'ended'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(comp.id, s)}
                                className={
                                  comp.status === s
                                    ? 'btn-primary text-sm py-2 px-4'
                                    : 'btn-ghost text-sm py-2 px-4'
                                }
                              >
                                Set {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Join code */}
                        <div>
                          <p className="section-title">Join Code</p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-admin-bg3 border border-admin-border rounded-xl px-4 py-2 text-admin-text text-lg tracking-widest">
                              {comp.join_code}
                            </span>
                            <button
                              onClick={() => copyCode(comp.join_code)}
                              className="btn-ghost px-3"
                            >
                              {copiedCode === comp.join_code ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        {/* Members */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="section-title mb-0">
                              Members ({detail?.members.length ?? '…'})
                            </p>
                            <button
                              onClick={() => openAddMember(comp.id)}
                              className="btn-ghost text-xs py-1.5 px-3 min-h-0"
                            >
                              + Add member
                            </button>
                          </div>
                          {!detail ? (
                            <div className="text-admin-text3 text-sm">Loading…</div>
                          ) : detail.members.length === 0 ? (
                            <div className="text-admin-text3 text-sm">No members yet.</div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {detail.members.map((m) => (
                                <div
                                  key={m.angler_id}
                                  className="flex items-center gap-3 bg-admin-bg3 rounded-xl px-3 py-2"
                                >
                                  {m.profiles && (
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                                      style={{ backgroundColor: m.profiles.avatar_color }}
                                    >
                                      {m.profiles.avatar_emoji}
                                    </div>
                                  )}
                                  <span className="flex-1 text-admin-text text-sm font-medium">
                                    {m.profiles?.username ?? m.angler_id}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setConfirmRemoveMember({
                                        compId: comp.id,
                                        anglerId: m.angler_id,
                                        username: m.profiles?.username ?? 'this angler',
                                      })
                                    }
                                    className="text-red-400/60 hover:text-red-400 text-xs min-h-[44px] px-2 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Danger zone */}
                        <div>
                          <p className="section-title text-red-400/60">Danger Zone</p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => setConfirmReset(comp.id)}
                              className="btn-danger text-sm"
                            >
                              Reset Competition
                            </button>
                            <button
                              onClick={() => setConfirmDelete(comp.id)}
                              className="btn-danger text-sm"
                            >
                              Delete Competition
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Create drawer */}
      <AnimatePresence>
        {showCreateDrawer && (
          <>
            <Backdrop onClick={() => setShowCreateDrawer(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-admin-bg2 border-l border-admin-border z-50 overflow-y-auto"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-admin-text">Create Competition</h2>
                  <button
                    onClick={() => setShowCreateDrawer(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text hover:bg-admin-bg3 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreate} className="flex flex-col gap-4 flex-1">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Summer Showdown"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      placeholder="Optional description…"
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={createForm.start_time}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, start_time: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">End Date & Time (optional)</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={createForm.end_time}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, end_time: e.target.value }))
                      }
                    />
                  </div>

                  {createError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-400 text-sm">{createError}</p>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateDrawer(false)}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="btn-primary flex-1"
                    >
                      {createLoading ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add-member drawer */}
      <AnimatePresence>
        {addMemberCompId && (
          <>
            <Backdrop onClick={() => setAddMemberCompId(null)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-admin-bg2 border-l border-admin-border z-50 flex flex-col"
            >
              <div className="p-6 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-admin-text">Add Members</h2>
                  <button
                    onClick={() => setAddMemberCompId(null)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text hover:bg-admin-bg3 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <input
                  type="text"
                  className="input mb-4"
                  placeholder="Search users…"
                  value={addableSearch}
                  onChange={(e) => setAddableSearch(e.target.value)}
                />

                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  {addableLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-admin-bg3 rounded-xl h-12 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredAddableUsers.length === 0 ? (
                    <div className="text-center text-admin-text3 py-12 text-sm">
                      {addableUsers.length === 0
                        ? 'Everyone is already a member.'
                        : 'No users match your search.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredAddableUsers.map((u) => {
                        const selected = selectedToAdd.has(u.id)
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 bg-admin-bg3 rounded-xl px-3 py-2 cursor-pointer border transition-colors ${
                              selected
                                ? 'border-admin-teal/50 bg-admin-teal-dim'
                                : 'border-transparent hover:border-admin-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-teal"
                              checked={selected}
                              onChange={() => toggleSelectToAdd(u.id)}
                            />
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                              style={{ backgroundColor: u.avatar_color }}
                            >
                              {u.avatar_emoji}
                            </div>
                            <span className="flex-1 text-admin-text text-sm font-medium truncate">
                              {u.username}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] uppercase tracking-wide bg-admin-bg3 text-admin-text2 px-1.5 py-0.5 rounded-full font-bold">
                                Admin
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-admin-border flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddMemberCompId(null)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={selectedToAdd.size === 0 || addSubmitLoading}
                    className="btn-primary flex-1"
                  >
                    {addSubmitLoading
                      ? 'Adding…'
                      : `Add selected (${selectedToAdd.size})`}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reset confirmation modal */}
      <AnimatePresence>
        {confirmReset && (
          <>
            <Backdrop onClick={() => setConfirmReset(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Reset Competition</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  This will delete all{' '}
                  <span className="text-admin-text font-semibold">
                    {details[confirmReset]?.catchCount ?? '?'}
                  </span>{' '}
                  catches in this competition. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmReset(null)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetConfirm(confirmReset)}
                    disabled={actionLoading}
                    className="btn-danger flex-1"
                  >
                    {actionLoading ? 'Resetting…' : 'Reset'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <Backdrop onClick={() => setConfirmDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Delete Competition</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  This will permanently delete{' '}
                  <span className="text-admin-text font-semibold">
                    {competitions.find((c) => c.id === confirmDelete)?.name}
                  </span>
                  . This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(confirmDelete)}
                    disabled={actionLoading}
                    className="btn-danger flex-1"
                  >
                    {actionLoading ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Remove member confirmation modal */}
      <AnimatePresence>
        {confirmRemoveMember && (
          <>
            <Backdrop onClick={() => setConfirmRemoveMember(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Remove Member</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  Remove{' '}
                  <span className="text-admin-text font-semibold">
                    {confirmRemoveMember.username}
                  </span>{' '}
                  from this competition? Their catches will remain but they won't appear
                  on the leaderboard.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmRemoveMember(null)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemoveMemberConfirm}
                    disabled={removeMemberLoading}
                    className="btn-danger flex-1"
                  >
                    {removeMemberLoading ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]"
          >
            <div
              className={`rounded-xl px-4 py-3 shadow-2xl border font-medium text-sm ${
                toast.kind === 'success'
                  ? 'bg-admin-bg2 border-admin-teal/40 text-admin-text'
                  : 'bg-admin-bg2 border-red-500/40 text-red-300'
              }`}
            >
              <span className="mr-2">{toast.kind === 'success' ? '✓' : '⚠'}</span>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
