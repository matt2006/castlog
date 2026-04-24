import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { getSpeciesEmoji } from '@/lib/species'
import { CatchDetailModal } from '@/components/shared/CatchDetailModal'
import type { Catch, Competition, LeaderboardEntry } from '@/types'

type DetailTab = 'leaderboard' | 'activity' | 'members'

type ActivityEvent = { kind: 'catch'; data: Catch }

interface MemberRow {
  angler_id: string
  joined_at: string
  profiles: { username: string; avatar_emoji: string; avatar_color: string } | null
}

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

// ── Sub-components ──────────────────────────────────────────────────────────

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[]
  profileId: string
  compCatches: Catch[]
  drilledAngler: LeaderboardEntry | null
  setDrilledAngler: (e: LeaderboardEntry | null) => void
  onSelectCatch: (c: Catch) => void
}

function LeaderboardTab({
  leaderboard,
  profileId,
  compCatches,
  drilledAngler,
  setDrilledAngler,
  onSelectCatch,
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
              isMe
                ? 'bg-angler-teal-l border-angler-teal/40'
                : 'bg-angler-white border-angler-border/60'
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
                {isMe && (
                  <span className="text-angler-teal text-[11px] ml-1 font-semibold">(you)</span>
                )}
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

function MembersTab({ members, profileId }: { members: MemberRow[]; profileId: string }) {
  return (
    <div className="space-y-2 pt-2">
      {members.length === 0 && (
        <p className="text-angler-text3 text-[13px] text-center py-8">No members yet.</p>
      )}
      {members.map((m) => {
        const isMe = m.angler_id === profileId
        return (
          <div
            key={m.angler_id}
            className={`flex items-center gap-3 rounded-[14px] px-3 py-3 border shadow-card-light ${
              isMe
                ? 'bg-angler-teal-l border-angler-teal/40'
                : 'bg-angler-white border-angler-border/60'
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
                {isMe && (
                  <span className="text-angler-teal text-[11px] ml-1 font-semibold">(you)</span>
                )}
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

// ── Main screen ──────────────────────────────────────────────────────────────

export function CompetitionDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const competitions = useStore((s) => s.competitions)
  const updateCompetition = useStore((s) => s.updateCompetition)

  const comp = competitions.find((c) => c.id === id)

  const [tab, setTab] = useState<DetailTab>('leaderboard')
  const [compCatches, setCompCatches] = useState<Catch[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drilledAngler, setDrilledAngler] = useState<LeaderboardEntry | null>(null)
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)
  const [showWinner, setShowWinner] = useState(false)

  const prevStatusRef = useRef(comp?.status)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!comp) navigate('/competitions', { replace: true })
  }, [comp, navigate])

  // Load all catches for this competition
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

  // Load members
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

  // Realtime: new catches in this competition
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

  // Realtime: competition status changes
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

  // Confetti + winner banner when competition transitions to ended
  useEffect(() => {
    if (!comp) return
    if (
      prevStatusRef.current !== 'ended' &&
      comp.status === 'ended' &&
      !confettiFired.current
    ) {
      confettiFired.current = true
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
      setShowWinner(true)
    }
    prevStatusRef.current = comp.status
  }, [comp?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const leaderboard = useMemo(() => buildLeaderboard(compCatches), [compCatches])
  const winner = leaderboard[0] ?? null

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: comp?.name, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch {
      // user cancelled
    }
  }

  if (!comp || !profile) return null

  return (
    <div data-theme="angler" className="fixed inset-0 z-[70] bg-angler-bg flex flex-col">
      {/* Header */}
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
      </div>

      {/* Winner banner */}
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

      {/* Tab bar */}
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

      {/* Scrollable content */}
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
            {tab === 'members' && <MembersTab members={members} profileId={profile.id} />}
          </>
        )}
      </div>

      {/* Catch detail modal — portaled to body via CatchDetailModal internals */}
      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        readOnly={selectedCatch?.angler_id !== profile.id}
        competitionName={comp.name}
      />
    </div>
  )
}
