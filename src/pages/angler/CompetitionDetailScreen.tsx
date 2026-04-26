import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { getSpeciesEmoji } from '@/lib/species'
import { CatchDetailModal } from '@/components/shared/CatchDetailModal'
import type { Catch, Competition, LeaderboardEntry, Profile } from '@/types'

type DetailTab = 'leaderboard' | 'activity' | 'members'
type ActivityEvent = { kind: 'catch'; data: Catch }

interface MemberRow {
  angler_id: string
  joined_at: string
  profiles: { username: string; avatar_emoji: string; avatar_color: string } | null
}

interface ToastState { message: string; kind: 'success' | 'error' }

// ── badge helpers ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Competition['status'], string> = {
  live: 'bg-angler-green/15 text-angler-green border-angler-green/30',
  upcoming: 'bg-angler-gold-l text-angler-gold border-angler-gold/30',
  ended: 'bg-angler-text3/10 text-angler-text3 border-angler-text3/20',
}
const STATUS_LABEL: Record<Competition['status'], string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  ended: 'Ended',
}

function StatusBadge({ status }: { status: Competition['status'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_BADGE[status]}`}
    >
      {status === 'live' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-angler-green animate-pulse" />
      )}
      {STATUS_LABEL[status]}
    </span>
  )
}

function generateJoinCode(): string {
  return Math.random().toString(36).slice(2, 8).toLowerCase()
}

// ── sub-components ────────────────────────────────────────────────────────────

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl leading-none">🥇</span>
  if (rank === 2) return <span className="text-2xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-2xl leading-none">🥉</span>
  return (
    <span className="text-angler-text3 font-bold text-base w-7 text-center tabular-nums flex-shrink-0">
      #{rank}
    </span>
  )
}

function buildLeaderboard(catches: Catch[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>()
  for (const c of catches) {
    if (!c.profiles) continue
    const ex = map.get(c.angler_id)
    if (ex) {
      ex.total_weight += c.weight_kg
      ex.catch_count++
      if (c.weight_kg > ex.biggest_catch) ex.biggest_catch = c.weight_kg
    } else {
      map.set(c.angler_id, {
        angler_id: c.angler_id,
        username: c.profiles.username,
        avatar_emoji: c.profiles.avatar_emoji,
        avatar_color: c.profiles.avatar_color,
        total_weight: c.weight_kg,
        catch_count: 1,
        biggest_catch: c.weight_kg,
        rank: 0,
      })
    }
  }
  const sorted = Array.from(map.values()).sort((a, b) => b.total_weight - a.total_weight)
  sorted.forEach((e, i) => { e.rank = i + 1 })
  return sorted
}

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[]
  profileId: string
  compCatches: Catch[]
  drilledAngler: LeaderboardEntry | null
  setDrilledAngler: (e: LeaderboardEntry | null) => void
  onSelectCatch: (c: Catch) => void
}

function LeaderboardTab({
  leaderboard, profileId, compCatches, drilledAngler, setDrilledAngler, onSelectCatch,
}: LeaderboardTabProps) {
  if (drilledAngler) {
    const anglerCatches = compCatches.filter((c) => c.angler_id === drilledAngler.angler_id)
    return (
      <div className="space-y-3 pt-2">
        <button
          onClick={() => setDrilledAngler(null)}
          className="flex items-center gap-2 text-angler-teal text-[14px] font-semibold min-h-[44px]"
        >
          <span className="text-[18px] leading-none">←</span> Back to leaderboard
        </button>
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: drilledAngler.avatar_color }}
          >
            {drilledAngler.avatar_emoji}
          </div>
          <div>
            <p className="font-extrabold text-angler-text text-[17px] leading-tight">
              {drilledAngler.username}
            </p>
            <p className="text-angler-text3 text-[12px]">
              {drilledAngler.catch_count} catch{drilledAngler.catch_count !== 1 ? 'es' : ''} ·{' '}
              {drilledAngler.total_weight.toFixed(2)} kg total
            </p>
          </div>
        </div>
        {anglerCatches.length === 0 ? (
          <p className="text-angler-text3 text-[13px] text-center py-8">No catches logged.</p>
        ) : (
          <div className="space-y-2">
            {anglerCatches.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCatch(c)}
                className="w-full flex items-center gap-3 bg-angler-white border border-angler-border/60 rounded-[14px] px-3 py-3 shadow-card-light text-left"
              >
                <div className="w-11 h-11 rounded-[10px] bg-angler-teal-l flex items-center justify-center text-[22px] leading-none flex-shrink-0">
                  {getSpeciesEmoji(c.species)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-angler-text text-[15px] leading-tight truncate">
                    {c.species}
                  </p>
                  <p className="text-angler-text3 text-[11px] mt-0.5">
                    {format(new Date(c.timestamp), 'dd MMM · HH:mm')}
                  </p>
                </div>
                <p className="text-angler-teal font-extrabold text-[17px] tabular-nums flex-shrink-0">
                  {c.weight_kg.toFixed(2)} kg
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-2">
      {leaderboard.length === 0 && (
        <p className="text-angler-text3 text-[13px] text-center py-8">No catches yet.</p>
      )}
      {leaderboard.map((entry) => {
        const isMe = entry.angler_id === profileId
        return (
          <button
            key={entry.angler_id}
            onClick={() => setDrilledAngler(entry)}
            className={`w-full flex items-center gap-3 rounded-[14px] px-3 py-3 border shadow-card-light text-left ${
              isMe ? 'bg-angler-teal-l border-angler-teal/40' : 'bg-angler-white border-angler-border/60'
            }`}
          >
            <RankIcon rank={entry.rank} />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: entry.avatar_color }}
            >
              {entry.avatar_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-angler-text text-[14px] leading-tight truncate">
                {entry.username}
                {isMe && <span className="text-angler-teal text-[11px] ml-1 font-semibold">(you)</span>}
              </p>
              <p className="text-angler-text3 text-[11px] mt-0.5">
                {entry.catch_count} catch{entry.catch_count !== 1 ? 'es' : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0 leading-tight">
              <p className="text-angler-teal font-extrabold text-[15px] tabular-nums">
                {entry.total_weight.toFixed(2)} kg
              </p>
              <p className="text-angler-text3 text-[11px] tabular-nums mt-0.5">
                PB {entry.biggest_catch.toFixed(2)} kg
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ActivityTab({ catches }: { catches: Catch[] }) {
  const events: ActivityEvent[] = useMemo(
    () =>
      [...catches]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((c) => ({ kind: 'catch' as const, data: c })),
    [catches]
  )

  return (
    <div className="space-y-2.5 pt-2">
      {events.length === 0 && (
        <p className="text-angler-text3 text-[13px] text-center py-8">No activity yet.</p>
      )}
      <AnimatePresence mode="popLayout">
        {events.map(({ data: c }) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-angler-white border border-angler-border/60 rounded-[14px] px-3 py-3 shadow-card-light"
          >
            {c.profiles && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: c.profiles.avatar_color }}
              >
                {c.profiles.avatar_emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-angler-text text-[13px] leading-snug">
                <span className="font-bold">{c.profiles?.username ?? 'Angler'}</span>{' '}
                caught a{' '}
                <span className="text-angler-teal font-semibold">
                  {getSpeciesEmoji(c.species)} {c.species}
                </span>{' '}
                <span className="text-angler-text2">({c.weight_kg.toFixed(2)} kg)</span>
              </p>
              <p className="text-angler-text3 text-[11px] mt-0.5">
                {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface MembersTabProps {
  members: MemberRow[]
  profileId: string
  isAdmin?: boolean
  onManage?: () => void
}

function MembersTab({ members, profileId, isAdmin, onManage }: MembersTabProps) {
  return (
    <div className="space-y-2 pt-2">
      {isAdmin && onManage && (
        <button
          onClick={onManage}
          className="w-full flex items-center justify-between bg-angler-teal-l border border-angler-teal/30 rounded-[14px] px-4 py-3 min-h-[44px]"
        >
          <span className="text-angler-teal font-semibold text-[14px]">
            Manage members ({members.length})
          </span>
          <span className="text-angler-teal text-[18px] leading-none">→</span>
        </button>
      )}
      {members.length === 0 && (
        <p className="text-angler-text3 text-[13px] text-center py-8">No members yet.</p>
      )}
      {members.map((m) => {
        const isMe = m.angler_id === profileId
        return (
          <div
            key={m.angler_id}
            className={`flex items-center gap-3 rounded-[14px] px-3 py-3 border shadow-card-light ${
              isMe ? 'bg-angler-teal-l border-angler-teal/40' : 'bg-angler-white border-angler-border/60'
            }`}
          >
            {m.profiles ? (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: m.profiles.avatar_color }}
              >
                {m.profiles.avatar_emoji}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-angler-bg2 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-angler-text text-[14px] leading-tight truncate">
                {m.profiles?.username ?? 'Unknown'}
                {isMe && <span className="text-angler-teal text-[11px] ml-1 font-semibold">(you)</span>}
              </p>
              <p className="text-angler-text3 text-[11px] mt-0.5">
                Joined {format(new Date(m.joined_at), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── confirm modal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string
  body: string | React.ReactNode
  confirmLabel: string
  confirmClass?: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ title, body, confirmLabel, confirmClass, loading, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <>
      <div className="absolute inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center z-40 p-5">
        <div className="bg-angler-white rounded-[18px] shadow-card-light p-5 max-w-sm w-full">
          <h3 className="font-extrabold text-angler-text text-[18px] mb-2">{title}</h3>
          <div className="text-angler-text2 text-[14px] mb-5 leading-snug">{body}</div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 h-11 rounded-[12px] text-white font-bold text-[15px] disabled:opacity-50 ${confirmClass ?? 'bg-red-500'}`}
            >
              {loading ? '…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── main screen ───────────────────────────────────────────────────────────────

export function CompetitionDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const competitions = useStore((s) => s.competitions)
  const updateCompetition = useStore((s) => s.updateCompetition)
  const removeCompetition = useStore((s) => s.removeCompetition)

  const isAdmin = profile?.role === 'admin'
  const comp = competitions.find((c) => c.id === id)

  // ── existing state ──
  const [tab, setTab] = useState<DetailTab>('leaderboard')
  const [compCatches, setCompCatches] = useState<Catch[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drilledAngler, setDrilledAngler] = useState<LeaderboardEntry | null>(null)
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)
  const [showWinner, setShowWinner] = useState(false)

  // ── admin state ──
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Status
  const [statusLoading, setStatusLoading] = useState(false)

  // Regen code
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)

  // Reset
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Add members
  const [addableUsers, setAddableUsers] = useState<Profile[]>([])
  const [addableLoading, setAddableLoading] = useState(false)
  const [addableSearch, setAddableSearch] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [addSubmitLoading, setAddSubmitLoading] = useState(false)

  // Remove member
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{ anglerId: string; username: string } | null>(null)
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevStatusRef = useRef(comp?.status)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!comp) navigate('/competitions', { replace: true })
  }, [comp, navigate])

  useEffect(() => {
    if (!id) return
    supabase
      .from('catches')
      .select('*, profiles(username, avatar_emoji, avatar_color)')
      .eq('competition_id', id)
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        if (data) setCompCatches(data as Catch[])
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase
      .from('competition_members')
      .select('angler_id, joined_at, profiles(username, avatar_emoji, avatar_color)')
      .eq('competition_id', id)
      .then(({ data }) => {
        if (data) setMembers(data as unknown as MemberRow[])
      })
  }, [id])

  // Realtime: new catches
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`comp-detail-catches:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'catches', filter: `competition_id=eq.${id}` },
        async (payload) => {
          const { data } = await supabase
            .from('catches')
            .select('*, profiles(username, avatar_emoji, avatar_color)')
            .eq('id', (payload.new as Catch).id)
            .single()
          if (data) setCompCatches((prev) => [data as Catch, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Realtime: status changes (for all viewers)
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`comp-detail-status:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'competitions', filter: `id=eq.${id}` },
        (payload) => updateCompetition(payload.new as Competition)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, updateCompetition])

  // Confetti + winner banner — fires for ALL viewers (admin or angler)
  useEffect(() => {
    if (!comp) return
    if (prevStatusRef.current !== 'ended' && comp.status === 'ended' && !confettiFired.current) {
      confettiFired.current = true
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
      setShowWinner(true)
    }
    prevStatusRef.current = comp.status
  }, [comp?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup toast timer
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const leaderboard = useMemo(() => buildLeaderboard(compCatches), [compCatches])
  const winner = leaderboard[0] ?? null

  // ── toast helper ──
  const showToastMsg = (message: string, kind: ToastState['kind'] = 'success') => {
    setToast({ message, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  // ── admin handlers ──────────────────────────────────────────────────────────

  const handleStatusChange = async (status: 'upcoming' | 'live' | 'ended') => {
    if (!comp) return
    setStatusLoading(true)
    const { data } = await supabase
      .from('competitions')
      .update({ status })
      .eq('id', comp.id)
      .select('*, venue:venues(*)')
      .single()
    if (data) updateCompetition(data as Competition)
    setStatusLoading(false)
  }

  const handleRegenCode = async () => {
    if (!comp) return
    setRegenLoading(true)
    const newCode = generateJoinCode()
    const { data, error } = await supabase
      .from('competitions')
      .update({ join_code: newCode })
      .eq('id', comp.id)
      .select('*, venue:venues(*)')
      .single()
    if (data) {
      updateCompetition(data as Competition)
      showToastMsg('Join code regenerated')
    } else {
      showToastMsg(error?.message ?? 'Failed to regenerate code', 'error')
    }
    setRegenLoading(false)
    setShowRegenConfirm(false)
    setShowAdminPanel(false)
  }

  const handleReset = async () => {
    if (!comp) return
    setResetLoading(true)
    await supabase.from('catches').delete().eq('competition_id', comp.id)
    setCompCatches([])
    showToastMsg('Competition reset — all catches deleted')
    setResetLoading(false)
    setShowResetConfirm(false)
    setShowAdminPanel(false)
  }

  const handleDelete = async () => {
    if (!comp) return
    setDeleteLoading(true)
    await supabase.from('competitions').delete().eq('id', comp.id)
    removeCompetition(comp.id)
    navigate('/competitions', { replace: true })
  }

  const openManageMembers = () => {
    setShowManageMembers(true)
    setShowAdminPanel(false)
    setShowAddPanel(false)
  }

  const openAddPanel = async () => {
    setShowAddPanel(true)
    setAddableSearch('')
    setSelectedToAdd(new Set())
    setAddableLoading(true)
    const existingIds = new Set(members.map((m) => m.angler_id))
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true })
    setAddableUsers(((data ?? []) as Profile[]).filter((p) => !existingIds.has(p.id)))
    setAddableLoading(false)
  }

  const filteredAddable = useMemo(() => {
    const q = addableSearch.trim().toLowerCase()
    if (!q) return addableUsers
    return addableUsers.filter((u) => u.username.toLowerCase().includes(q))
  }, [addableUsers, addableSearch])

  const toggleSelectToAdd = (userId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const handleAddSelected = async () => {
    if (!comp || selectedToAdd.size === 0) return
    setAddSubmitLoading(true)
    const rows = Array.from(selectedToAdd).map((angler_id) => ({ competition_id: comp.id, angler_id }))
    const { error } = await supabase.from('competition_members').insert(rows)
    if (error) {
      showToastMsg(error.message || 'Failed to add members', 'error')
      setAddSubmitLoading(false)
      return
    }
    // Reload members
    const { data } = await supabase
      .from('competition_members')
      .select('angler_id, joined_at, profiles(username, avatar_emoji, avatar_color)')
      .eq('competition_id', comp.id)
    if (data) setMembers(data as unknown as MemberRow[])
    showToastMsg(`Added ${selectedToAdd.size} member${selectedToAdd.size === 1 ? '' : 's'}`)
    setAddSubmitLoading(false)
    setShowAddPanel(false)
    setSelectedToAdd(new Set())
  }

  const handleRemoveMember = async () => {
    if (!comp || !confirmRemoveMember) return
    setRemoveMemberLoading(true)
    const { error } = await supabase
      .from('competition_members')
      .delete()
      .eq('competition_id', comp.id)
      .eq('angler_id', confirmRemoveMember.anglerId)
    if (error) {
      showToastMsg(error.message || 'Failed to remove member', 'error')
      setRemoveMemberLoading(false)
      return
    }
    setMembers((prev) => prev.filter((m) => m.angler_id !== confirmRemoveMember.anglerId))
    showToastMsg(`Removed ${confirmRemoveMember.username}`)
    setRemoveMemberLoading(false)
    setConfirmRemoveMember(null)
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: comp?.name, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch { /* user cancelled */ }
  }

  if (!comp || !profile) return null

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div data-theme="angler" className="fixed inset-0 z-[70] bg-angler-bg flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 pt-[calc(env(safe-area-inset-top,0)+0.75rem)] pb-3 bg-angler-white border-b border-angler-border flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 -ml-2 flex items-center justify-center text-angler-text2 min-h-[44px]"
          aria-label="Back"
        >
          <span className="text-[22px] leading-none">←</span>
        </button>
        <h1 className="flex-1 font-extrabold text-angler-text text-[17px] leading-tight truncate">
          {comp.name}
        </h1>
        <StatusBadge status={comp.status} />
        <button
          onClick={handleShare}
          className="w-10 h-10 flex items-center justify-center text-angler-text2 min-h-[44px]"
          aria-label="Share"
        >
          <span className="text-[18px] leading-none">🔗</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowAdminPanel(true)}
            className="w-10 h-10 flex items-center justify-center text-angler-text2 min-h-[44px]"
            aria-label="Admin controls"
          >
            <span className="text-[15px] tracking-[3px] leading-none font-bold select-none">···</span>
          </button>
        )}
      </div>

      {/* ── Winner banner ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWinner && winner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 bg-angler-gold-l border border-angler-gold/40 rounded-[14px] px-4 py-3 flex items-center gap-3 flex-shrink-0"
          >
            <span className="text-2xl leading-none">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-angler-text text-[15px] leading-tight">
                {winner.avatar_emoji} {winner.username} wins!
              </p>
              <p className="text-angler-text2 text-[12px] mt-0.5">
                {winner.total_weight.toFixed(2)} kg total
              </p>
            </div>
            <button
              onClick={() => setShowWinner(false)}
              className="text-angler-text3 text-[22px] leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-2 flex gap-1.5 flex-shrink-0">
        {(['leaderboard', 'activity', 'members'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setDrilledAngler(null) }}
            className={`flex-1 h-10 rounded-[10px] text-[13px] font-semibold transition-all min-h-[44px] ${
              tab === t
                ? 'bg-angler-teal text-white shadow-card-light'
                : 'bg-angler-white text-angler-text2 border border-angler-border'
            }`}
          >
            {t === 'leaderboard' ? 'Board' : t === 'activity' ? 'Activity' : 'Members'}
          </button>
        ))}
      </div>

      {/* ── Scrollable tab content ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0)+1.25rem)]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-angler-teal border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'leaderboard' && (
              <LeaderboardTab
                leaderboard={leaderboard}
                profileId={profile.id}
                compCatches={compCatches}
                drilledAngler={drilledAngler}
                setDrilledAngler={setDrilledAngler}
                onSelectCatch={setSelectedCatch}
              />
            )}
            {tab === 'activity' && <ActivityTab catches={compCatches} />}
            {tab === 'members' && (
              <MembersTab
                members={members}
                profileId={profile.id}
                isAdmin={isAdmin}
                onManage={openManageMembers}
              />
            )}
          </>
        )}
      </div>

      {/* ── CatchDetailModal ──────────────────────────────────────────────── */}
      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        readOnly={selectedCatch?.angler_id !== profile.id}
        competitionName={comp.name}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN OVERLAYS  — all absolute within the fixed container
          z-10  backdrop
          z-20  admin panel sheet
          z-20  manage-members sheet (replaces admin panel)
          z-30  add-users panel (within manage-members)
          z-40  confirmation modals
          ══════════════════════════════════════════════════════════════════ */}

      {/* ── Admin Panel (bottom sheet) ────────────────────────────────────── */}
      <AnimatePresence>
        {showAdminPanel && (
          <>
            <motion.div
              key="ap-bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-10"
              onClick={() => setShowAdminPanel(false)}
            />
            <motion.div
              key="ap-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 bg-angler-white rounded-t-[24px] z-20 flex flex-col overflow-hidden"
              style={{ maxHeight: '80%' }}
            >
              {/* drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-angler-border" />
              </div>

              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-angler-border flex-shrink-0">
                <h2 className="font-extrabold text-angler-text text-[18px]">Admin Controls</h2>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="w-10 h-10 flex items-center justify-center text-angler-text2 text-[22px]"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

                {/* Status */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
                    Status
                  </p>
                  <div className="flex gap-2">
                    {(['upcoming', 'live', 'ended'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={statusLoading}
                        className={`flex-1 h-10 rounded-[10px] text-[13px] font-semibold min-h-[44px] transition-all disabled:opacity-50 ${
                          comp.status === s
                            ? 'bg-angler-teal text-white'
                            : 'bg-angler-bg2 text-angler-text2 border border-angler-border'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Join code */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
                    Join Code
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[22px] tracking-widest text-angler-text">
                      {comp.join_code}
                    </span>
                    <button
                      onClick={() => setShowRegenConfirm(true)}
                      className="bg-angler-bg2 border border-angler-border rounded-[10px] px-3 h-9 text-[13px] font-semibold text-angler-text2 min-h-[44px]"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
                    Members
                  </p>
                  <button
                    onClick={openManageMembers}
                    className="w-full flex items-center justify-between bg-angler-bg2 border border-angler-border rounded-[12px] px-4 h-12 min-h-[44px]"
                  >
                    <span className="text-angler-text font-semibold text-[14px]">
                      Manage members ({members.length})
                    </span>
                    <span className="text-angler-text3 text-[18px] leading-none">→</span>
                  </button>
                </div>

                {/* Danger zone */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-red-400/70 mb-2">
                    Danger Zone
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full h-11 rounded-[12px] bg-red-50 border border-red-200 text-red-600 font-semibold text-[14px] min-h-[44px]"
                    >
                      Reset Competition (delete all catches)
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full h-11 rounded-[12px] bg-red-500 text-white font-bold text-[14px] min-h-[44px]"
                    >
                      Delete Competition
                    </button>
                  </div>
                </div>

                {/* safe-area padding */}
                <div className="h-[env(safe-area-inset-bottom,0)]" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Manage Members overlay (full-screen) ──────────────────────────── */}
      <AnimatePresence>
        {showManageMembers && (
          <motion.div
            key="mm-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 bg-angler-bg z-20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 pt-[calc(env(safe-area-inset-top,0)+0.75rem)] pb-3 bg-angler-white border-b border-angler-border flex-shrink-0">
              {showAddPanel ? (
                <button
                  onClick={() => setShowAddPanel(false)}
                  className="w-11 h-11 -ml-2 flex items-center justify-center text-angler-text2 min-h-[44px]"
                >
                  <span className="text-[22px] leading-none">←</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowManageMembers(false)}
                  className="w-11 h-11 -ml-2 flex items-center justify-center text-angler-text2 min-h-[44px]"
                >
                  <span className="text-[22px] leading-none">←</span>
                </button>
              )}
              <h2 className="flex-1 font-extrabold text-angler-text text-[17px]">
                {showAddPanel ? 'Add Members' : `Members (${members.length})`}
              </h2>
              {!showAddPanel && (
                <button
                  onClick={openAddPanel}
                  className="bg-angler-teal text-white font-bold text-[13px] px-4 rounded-[10px] min-h-[44px]"
                >
                  + Add
                </button>
              )}
            </div>

            {/* Content */}
            {showAddPanel ? (
              /* ── Add users picker ── */
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="px-5 py-3 flex-shrink-0">
                  <input
                    type="text"
                    className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                    placeholder="Search anglers…"
                    value={addableSearch}
                    onChange={(e) => setAddableSearch(e.target.value)}
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5">
                  {addableLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 rounded-full border-2 border-angler-teal border-t-transparent animate-spin" />
                    </div>
                  ) : filteredAddable.length === 0 ? (
                    <p className="text-angler-text3 text-[13px] text-center py-12">
                      {addableUsers.length === 0 ? 'Everyone is already a member.' : 'No anglers match your search.'}
                    </p>
                  ) : (
                    <div className="space-y-2 pb-4">
                      {filteredAddable.map((u) => {
                        const selected = selectedToAdd.has(u.id)
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 rounded-[14px] px-3 py-3 border cursor-pointer transition-colors min-h-[44px] ${
                              selected
                                ? 'bg-angler-teal-l border-angler-teal/40'
                                : 'bg-angler-white border-angler-border/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-teal flex-shrink-0"
                              checked={selected}
                              onChange={() => toggleSelectToAdd(u.id)}
                            />
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                              style={{ backgroundColor: u.avatar_color }}
                            >
                              {u.avatar_emoji}
                            </div>
                            <span className="flex-1 font-semibold text-angler-text text-[14px] truncate">
                              {u.username}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] uppercase tracking-wide bg-angler-bg2 text-angler-text3 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                                Admin
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-angler-border flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowAddPanel(false)}
                    className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text font-semibold text-[15px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedToAdd.size === 0 || addSubmitLoading}
                    className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] disabled:opacity-50"
                  >
                    {addSubmitLoading ? 'Adding…' : `Add (${selectedToAdd.size})`}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Member list ── */
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-2">
                {members.length === 0 && (
                  <p className="text-angler-text3 text-[13px] text-center py-12">No members yet.</p>
                )}
                {members.map((m) => (
                  <div
                    key={m.angler_id}
                    className="flex items-center gap-3 bg-angler-white border border-angler-border/60 rounded-[14px] px-3 py-3 shadow-card-light"
                  >
                    {m.profiles ? (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: m.profiles.avatar_color }}
                      >
                        {m.profiles.avatar_emoji}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-angler-bg2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-angler-text text-[14px] leading-tight truncate">
                        {m.profiles?.username ?? 'Unknown'}
                        {m.angler_id === profile.id && (
                          <span className="text-angler-teal text-[11px] ml-1 font-semibold">(you)</span>
                        )}
                      </p>
                      <p className="text-angler-text3 text-[11px] mt-0.5">
                        Joined {format(new Date(m.joined_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmRemoveMember({
                        anglerId: m.angler_id,
                        username: m.profiles?.username ?? 'this angler',
                      })}
                      className="text-red-400/60 hover:text-red-500 text-[13px] font-semibold min-h-[44px] px-2 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Remove-member confirmation — z-30 within manage-members panel */}
            <AnimatePresence>
              {confirmRemoveMember && (
                <ConfirmModal
                  title="Remove Member"
                  body={
                    <>
                      Remove <strong>{confirmRemoveMember.username}</strong> from this competition?
                      Their catches stay on record but they'll drop off the leaderboard.
                    </>
                  }
                  confirmLabel="Remove"
                  loading={removeMemberLoading}
                  onConfirm={handleRemoveMember}
                  onCancel={() => setConfirmRemoveMember(null)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Regen code confirmation ───────────────────────────────────────── */}
      <AnimatePresence>
        {showRegenConfirm && (
          <ConfirmModal
            title="Regenerate Code?"
            body="The old code will stop working immediately. Share the new code with anglers who haven't joined yet."
            confirmLabel="Regenerate"
            confirmClass="bg-angler-teal"
            loading={regenLoading}
            onConfirm={handleRegenCode}
            onCancel={() => setShowRegenConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Reset confirmation ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showResetConfirm && (
          <ConfirmModal
            title="Reset Competition"
            body={
              <>
                This will permanently delete all <strong>{compCatches.length}</strong> catch
                {compCatches.length !== 1 ? 'es' : ''} in this competition.
                Members stay. This cannot be undone.
              </>
            }
            confirmLabel="Reset"
            loading={resetLoading}
            onConfirm={handleReset}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete Competition"
            body={
              <>
                Permanently delete <strong>{comp.name}</strong>? All catches and membership
                records will be removed. This cannot be undone.
              </>
            }
            confirmLabel="Delete"
            loading={deleteLoading}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div
              className={`rounded-[14px] px-4 py-3 shadow-elevated-light font-semibold text-[14px] flex items-center gap-2 ${
                toast.kind === 'success'
                  ? 'bg-angler-white border border-angler-border text-angler-text'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              <span>{toast.kind === 'success' ? '✓' : '⚠'}</span>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
