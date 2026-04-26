import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { VenuePicker } from '@/components/VenuePicker'
import type { Competition, Venue } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

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
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}
    >
      {status === 'live' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-angler-green animate-pulse" />
      )}
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Convert an ISO timestamp to a value suitable for a datetime-local input. */
function toLocalDatetimeValue(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface CompForm {
  name: string
  description: string
  start_time: string
  end_time: string
  venue_id: string | null
}

const EMPTY_FORM: CompForm = {
  name: '',
  description: '',
  start_time: '',
  end_time: '',
  venue_id: null,
}

// ── shared field styles ───────────────────────────────────────────────────────
const INPUT = 'w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]'
const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5'

// ── sheet ─────────────────────────────────────────────────────────────────────

interface CompSheetProps {
  title: string
  form: CompForm
  setForm: (f: CompForm) => void
  onSave: (e: FormEvent) => void
  onClose: () => void
  saving: boolean
  error: string | null
  venues: Venue[]
  /** If true, start_time is required (create); for edit show pre-filled */
  requireStart?: boolean
}

function CompSheet({
  title, form, setForm, onSave, onClose, saving, error, venues, requireStart,
}: CompSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="cs-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        key="cs-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 h-[85vh] bg-angler-white rounded-t-[24px] z-50 flex flex-col overflow-hidden"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-angler-border" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-angler-border flex-shrink-0">
          <h2 className="font-extrabold text-angler-text text-[18px]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-angler-text2 text-[22px]"
          >
            ×
          </button>
        </div>

        {/* scrollable form */}
        <form
          onSubmit={onSave}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4"
        >
          <div>
            <label className={LABEL}>Name *</label>
            <input
              type="text"
              className={INPUT}
              placeholder="Summer Showdown"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              placeholder="Optional description…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start *</label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required={requireStart}
              />
            </div>
            <div>
              <label className={LABEL}>End (optional)</label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>

          <VenuePicker
            venues={venues}
            value={form.venue_id}
            onChange={(id) => setForm({ ...form, venue_id: id })}
          />

          {error && (
            <p className="text-red-500 text-[13px]">{error}</p>
          )}

          {/* footer buttons */}
          <div className="flex gap-3 pt-2 pb-[env(safe-area-inset-bottom,0)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-[12px] bg-angler-bg2 text-angler-text text-[15px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 rounded-[12px] bg-angler-teal text-white text-[15px] font-bold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}

// ── main screen ───────────────────────────────────────────────────────────────

export function CompetitionsScreen() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const catches = useStore((s) => s.catches)
  const competitions = useStore((s) => s.competitions)
  const venues = useStore((s) => s.venues)
  const setCompetitions = useStore((s) => s.setCompetitions)
  const addCompetition = useStore((s) => s.addCompetition)
  const updateCompetition = useStore((s) => s.updateCompetition)

  const isAdmin = profile?.role === 'admin'

  // ── join ──
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [joining, setJoining] = useState(false)
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})

  // ── create ──
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [createForm, setCreateForm] = useState<CompForm>(EMPTY_FORM)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── edit ──
  const [editComp, setEditComp] = useState<Competition | null>(null)
  const [editForm, setEditForm] = useState<CompForm>(EMPTY_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Body scroll lock when a sheet is open
  useEffect(() => {
    const open = showCreateSheet || editComp !== null
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCreateSheet, editComp])

  const loadMemberCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setMemberCounts({}); return }
    const { data } = await supabase
      .from('competition_members')
      .select('competition_id')
      .in('competition_id', ids)
    if (!data) return
    const counts: Record<string, number> = {}
    for (const row of data as { competition_id: string }[]) {
      counts[row.competition_id] = (counts[row.competition_id] ?? 0) + 1
    }
    setMemberCounts(counts)
  }, [])

  useEffect(() => {
    loadMemberCounts(competitions.map((c) => c.id))
  }, [competitions, loadMemberCounts])

  const sortedComps = useMemo(() => {
    const order = { live: 0, upcoming: 1, ended: 2 } as const
    return [...competitions].sort((a, b) => order[a.status] - order[b.status])
  }, [competitions])

  const myCatchesPerComp = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of catches) {
      if (c.competition_id && c.angler_id === profile?.id) {
        map[c.competition_id] = (map[c.competition_id] ?? 0) + 1
      }
    }
    return map
  }, [catches, profile?.id])

  // ── join handler ──
  const handleJoin = async () => {
    if (!profile || joinCode.trim().length !== 6) return
    setJoinError('')
    setJoinSuccess('')
    setJoining(true)

    const { data: comp, error: lookupError } = await supabase
      .from('competitions')
      .select('*')
      .eq('join_code', joinCode.toLowerCase().trim())
      .single()

    if (lookupError || !comp) {
      setJoinError('Invalid code. Please try again.')
      setJoining(false)
      return
    }

    const { error: joinErr } = await supabase
      .from('competition_members')
      .insert({ competition_id: comp.id, angler_id: profile.id })

    if (joinErr) {
      if (joinErr.code === '23505') {
        setJoinError("You've already joined this competition.")
      } else {
        setJoinError('Something went wrong. Try again.')
      }
      setJoining(false)
      return
    }

    if (!competitions.find((c) => c.id === comp.id)) {
      setCompetitions([comp as Competition, ...competitions])
    }

    setJoinSuccess(`Joined "${comp.name}" successfully!`)
    setJoinCode('')
    setJoining(false)
    navigate(`/competitions/${comp.id}`)
  }

  // ── create handler ──
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
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
        created_by: profile.id,
        venue_id: createForm.venue_id,
      })
      .select('*, venue:venues(*)')
      .single()

    if (error || !data) {
      setCreateError(error?.message ?? 'Failed to create competition')
      setCreateLoading(false)
      return
    }

    // Auto-join the admin as a member
    await supabase.from('competition_members').insert({
      competition_id: data.id,
      angler_id: profile.id,
    })

    addCompetition(data as Competition)
    setCreateLoading(false)
    setShowCreateSheet(false)
    setCreateForm(EMPTY_FORM)
  }

  // ── edit handlers ──
  const openEdit = (comp: Competition) => {
    setEditComp(comp)
    setEditForm({
      name: comp.name,
      description: comp.description ?? '',
      start_time: toLocalDatetimeValue(comp.start_time),
      end_time: comp.end_time ? toLocalDatetimeValue(comp.end_time) : '',
      venue_id: comp.venue_id,
    })
    setEditError(null)
  }

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editComp) return
    setEditLoading(true)
    setEditError(null)

    const { data, error } = await supabase
      .from('competitions')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        venue_id: editForm.venue_id,
      })
      .eq('id', editComp.id)
      .select('*, venue:venues(*)')
      .single()

    if (error || !data) {
      setEditError(error?.message ?? 'Failed to save')
      setEditLoading(false)
      return
    }

    updateCompetition(data as Competition)
    setEditLoading(false)
    setEditComp(null)
  }

  if (!profile) return null

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
          Competitions
        </h1>
        {isAdmin && (
          <button
            onClick={() => {
              setCreateForm(EMPTY_FORM)
              setCreateError(null)
              setShowCreateSheet(true)
            }}
            className="bg-angler-teal text-white font-bold text-[13px] px-4 rounded-[10px] min-h-[44px] flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="text-[18px] leading-none font-normal">+</span>
            New
          </button>
        )}
      </div>

      {/* Join card */}
      <div className="bg-angler-white rounded-[18px] shadow-card-light p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
          Enter join code
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[16px] font-mono lowercase tracking-widest text-center text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
            placeholder="abc123"
            maxLength={6}
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toLowerCase().replace(/\s+/g, '').slice(0, 6))
              setJoinError('')
              setJoinSuccess('')
            }}
          />
          <button
            onClick={handleJoin}
            disabled={joining || joinCode.trim().length !== 6}
            className="bg-angler-teal text-white font-bold text-[14px] px-5 rounded-[12px] min-h-[44px] transition-opacity disabled:bg-angler-text3/30"
          >
            {joining ? '…' : 'Join'}
          </button>
        </div>
        <AnimatePresence>
          {joinError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-[12px] mt-2"
            >
              {joinError}
            </motion.p>
          )}
          {joinSuccess && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-angler-teal text-[12px] font-semibold mt-2"
            >
              {joinSuccess}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Competition list */}
      {sortedComps.length === 0 ? (
        <div className="bg-angler-white rounded-[14px] border border-angler-border py-12 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-angler-text2 text-[13px] font-medium">No competitions yet.</p>
          <p className="text-angler-text3 text-[12px] mt-1">
            {isAdmin ? 'Create one with the button above.' : 'Ask your organiser for a join code.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedComps.map((comp) => {
            const myCatches = myCatchesPerComp[comp.id] ?? 0
            const anglerCount = memberCounts[comp.id]

            return (
              <div
                key={comp.id}
                className="bg-angler-white rounded-[18px] shadow-card-light p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={comp.status} />
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-angler-teal-l text-angler-teal border border-angler-teal/20">
                        ✓ Joined
                      </span>
                    </div>
                    <h3 className="font-bold text-angler-text text-[17px] leading-tight mt-1.5">
                      {comp.name}
                    </h3>
                    {comp.description && (
                      <p className="text-angler-text2 text-[13px] mt-1 leading-snug">
                        {comp.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-angler-text3">
                      <span>📅 {format(new Date(comp.start_time), 'dd MMM HH:mm')}</span>
                      {comp.end_time && (
                        <span>→ {format(new Date(comp.end_time), 'dd MMM HH:mm')}</span>
                      )}
                      {comp.venue && (
                        <span>📍 {comp.venue.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => openEdit(comp)}
                        className="w-9 h-9 flex items-center justify-center text-angler-text3 hover:text-angler-text rounded-[10px] hover:bg-angler-bg2 transition-colors min-h-[44px]"
                        aria-label="Edit competition"
                      >
                        <span className="text-[16px]">✏️</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/competitions/${comp.id}`)}
                      className="bg-angler-teal text-white rounded-[12px] px-3 h-10 text-[13px] font-bold min-h-[44px]"
                    >
                      View →
                    </button>
                  </div>
                </div>

                {/* 3 detail tiles */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-angler-bg2 rounded-[12px] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-angler-text3">
                      Code
                    </p>
                    <p className="text-angler-text font-mono font-bold text-[13px] mt-0.5 tracking-wider">
                      {comp.join_code}
                    </p>
                  </div>
                  <div className="bg-angler-bg2 rounded-[12px] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-angler-text3">
                      Anglers
                    </p>
                    <p className="text-angler-text font-extrabold text-[15px] mt-0.5 tabular-nums">
                      {anglerCount ?? '…'}
                    </p>
                  </div>
                  <div className="bg-angler-bg2 rounded-[12px] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-angler-text3">
                      My Catches
                    </p>
                    <p className="text-angler-teal font-extrabold text-[15px] mt-0.5 tabular-nums">
                      {myCatches}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create sheet ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateSheet && (
          <CompSheet
            title="New Competition"
            form={createForm}
            setForm={setCreateForm}
            onSave={handleCreate}
            onClose={() => setShowCreateSheet(false)}
            saving={createLoading}
            error={createError}
            venues={venues}
            requireStart
          />
        )}
      </AnimatePresence>

      {/* ── Edit sheet ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editComp && (
          <CompSheet
            title="Edit Competition"
            form={editForm}
            setForm={setEditForm}
            onSave={handleEditSave}
            onClose={() => setEditComp(null)}
            saving={editLoading}
            error={editError}
            venues={venues}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
