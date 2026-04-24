import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import type { Competition } from '@/types'

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

export function CompetitionsScreen() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const catches = useStore((s) => s.catches)
  const competitions = useStore((s) => s.competitions)
  const setCompetitions = useStore((s) => s.setCompetitions)

  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [joining, setJoining] = useState(false)
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})

  const loadMemberCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setMemberCounts({})
      return
    }
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

  if (!profile) return null

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-4">
      <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
        Competitions
      </h1>

      {/* Join card */}
      <div className="bg-angler-white rounded-[18px] shadow-card-light p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
          Enter join code
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-angler-bg2 border border-angler-border rounded-[12px] px-4 py-3 text-[15px] font-mono lowercase tracking-widest text-center text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
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
            Ask your organiser for a join code.
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
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/competitions/${comp.id}`)}
                    className="bg-angler-teal text-white rounded-[12px] px-3 h-10 text-[13px] font-bold min-h-[44px] flex-shrink-0"
                  >
                    View →
                  </button>
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
    </div>
  )
}
