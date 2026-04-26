import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import { CatchCard } from '@/components/shared/CatchCard'
import { CatchDetailModal } from '@/components/shared/CatchDetailModal'
import type { Catch } from '@/types'

type FilterCategory = 'All' | 'Coarse' | 'Game' | 'Sea' | 'Competition'

const COARSE_SPECIES = new Set([
  'Common Carp', 'Mirror Carp', 'Grass Carp', 'Bream', 'Tench', 'Roach',
  'Rudd', 'Chub', 'Barbel', 'Dace', 'Crucian Carp', 'Bleak', 'Gudgeon',
  'Silver Bream', 'Eel',
])
const GAME_SPECIES = new Set([
  'Atlantic Salmon', 'Brown Trout', 'Sea Trout', 'Rainbow Trout', 'Grayling',
  'Arctic Char', 'Pike', 'Perch', 'Zander',
])

function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const from = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

function calcStreak(catches: Catch[]): number {
  if (catches.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = new Set(
    catches.map((c) => {
      const d = new Date(c.timestamp)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )

  let streak = 0
  let cursor = today.getTime()

  while (days.has(cursor)) {
    streak++
    cursor -= 86400000
  }

  return streak
}

export function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const profile = useStore((s) => s.profile)
  const catches = useStore((s) => s.catches)
  const competitions = useStore((s) => s.competitions)
  const removeCatch = useStore((s) => s.removeCatch)

  const [filter, setFilter] = useState<FilterCategory>('All')
  const [speciesSearch, setSpeciesSearch] = useState(searchParams.get('species') ?? '')
  const [venueFilter, setVenueFilter] = useState(searchParams.get('venue') ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchParams.get('species')) {
      setSpeciesSearch(searchParams.get('species') ?? '')
      setSearchParams({}, { replace: true })
    }
    if (searchParams.get('venue')) {
      setVenueFilter(searchParams.get('venue') ?? '')
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const totalFish = catches.length
  const totalWeight = catches.reduce((s, c) => s + c.weight_kg, 0)
  const pb = catches.length > 0 ? Math.max(...catches.map((c) => c.weight_kg)) : 0

  const favouriteSpecies = useMemo(() => {
    if (catches.length === 0) return '—'
    const freq: Record<string, number> = {}
    for (const c of catches) freq[c.species] = (freq[c.species] ?? 0) + 1
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
  }, [catches])

  const streak = useMemo(() => calcStreak(catches), [catches])

  const animFish = useAnimatedCounter(totalFish)
  const animWeight = useAnimatedCounter(totalWeight)
  const animPb = useAnimatedCounter(pb)

  const filteredCatches = useMemo(() => {
    let result = catches
    if (filter === 'Coarse') result = result.filter((c) => COARSE_SPECIES.has(c.species))
    else if (filter === 'Game') result = result.filter((c) => GAME_SPECIES.has(c.species))
    else if (filter === 'Sea')
      result = result.filter(
        (c) => !COARSE_SPECIES.has(c.species) && !GAME_SPECIES.has(c.species)
      )
    else if (filter === 'Competition')
      result = result.filter((c) => c.competition_id !== null)

    if (speciesSearch.trim()) {
      const q = speciesSearch.toLowerCase()
      result = result.filter((c) => c.species.toLowerCase().includes(q))
    }
    if (venueFilter.trim()) {
      result = result.filter((c) => c.venue_id === venueFilter)
    }
    return result
  }, [catches, filter, speciesSearch, venueFilter])

  const competitionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const comp of competitions) map[comp.id] = comp.name
    return map
  }, [competitions])

  const handleDelete = async (catchId: string) => {
    await supabase.from('catches').delete().eq('id', catchId)
    removeCatch(catchId)
  }

  if (!profile) return null

  const anglerSince = format(new Date(profile.created_at), 'MMM yyyy')

  const filterTabs: FilterCategory[] = ['All', 'Coarse', 'Game', 'Sea', 'Competition']

  const stats = [
    {
      label: 'Total Fish',
      value: Math.round(animFish).toString(),
      isZero: totalFish === 0,
    },
    {
      label: 'Total Weight',
      value: `${animWeight.toFixed(1)} kg`,
      isZero: totalWeight === 0,
    },
    {
      label: 'Fav. Species',
      value: favouriteSpecies,
      isZero: catches.length === 0,
    },
    {
      label: 'Personal Best',
      value: `${animPb.toFixed(1)} kg`,
      isZero: pb === 0,
    },
  ]

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-6">
      {/* Header card */}
      <div className="bg-angler-white rounded-[18px] shadow-card-light px-4 py-3.5 flex items-center gap-3">
        <div className="w-[46px] h-[46px] rounded-full bg-angler-teal-l flex items-center justify-center text-[24px] leading-none shrink-0">
          🎣
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-angler-text text-[16px] leading-tight truncate">
            {profile.username}
          </p>
          <p className="text-angler-text2 text-[12px] mt-0.5">Angler since {anglerSince}</p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="w-11 h-11 flex items-center justify-center text-angler-text2 hover:text-angler-text transition-colors"
            aria-label="Settings"
          >
            <span className="text-[20px]">⚙️</span>
          </button>
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-36 bg-angler-white border border-angler-border rounded-xl shadow-elevated-light overflow-hidden z-50"
              >
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    supabase.auth.signOut()
                  }}
                  className="w-full px-4 py-3 text-left text-angler-text hover:bg-angler-bg2 text-sm font-medium transition-colors min-h-[44px] flex items-center"
                >
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stat scroll row */}
      <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 scrollbar-hide">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-angler-bg2 rounded-[14px] px-3 py-2.5 min-w-[100px] flex-shrink-0 flex flex-col gap-1"
          >
            <p
              className={`text-[20px] font-extrabold leading-tight truncate tabular-nums ${
                stat.isZero ? 'text-angler-text3' : 'text-angler-teal'
              }`}
            >
              {stat.value}
            </p>
            <p className="text-[11px] font-semibold text-angler-text2 leading-tight">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-[oklch(0.68_0.17_50_/_0.12)] border border-[oklch(0.68_0.17_50_/_0.28)] text-[oklch(0.52_0.17_50)]">
            🔥 {streak}-day streak
          </span>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => navigate('/map')}
          className="bg-angler-white rounded-[14px] shadow-card-light px-3 py-3.5 flex flex-col items-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          <span className="text-angler-teal text-[22px] leading-none">🗺️</span>
          <span className="text-angler-text text-[12px] font-semibold text-center leading-tight">Catch Map</span>
        </button>
        <button
          onClick={() => navigate('/species')}
          className="bg-angler-white rounded-[14px] shadow-card-light px-3 py-3.5 flex flex-col items-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          <span className="text-angler-teal text-[22px] leading-none">📖</span>
          <span className="text-angler-text text-[12px] font-semibold text-center leading-tight">Species Guide</span>
        </button>
        <button
          onClick={() => navigate('/venues')}
          className="bg-angler-white rounded-[14px] shadow-card-light px-3 py-3.5 flex flex-col items-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          <span className="text-angler-teal text-[22px] leading-none">📍</span>
          <span className="text-angler-text text-[12px] font-semibold text-center leading-tight">Venues</span>
        </button>
      </div>

      {/* Your Catches */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-angler-text2">
            Your Catches
          </h2>
          {venueFilter && (
            <button
              onClick={() => setVenueFilter('')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-angler-teal-l border border-angler-teal/30 text-angler-teal"
            >
              📍 Venue filter
              <span className="ml-0.5 text-[10px]">✕</span>
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide mb-3">
          {filterTabs.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 h-10 rounded-full text-[13px] font-semibold min-h-[44px] transition-all ${
                filter === f
                  ? 'bg-angler-teal text-white shadow-card-light'
                  : 'bg-angler-white text-angler-text2 border border-angler-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={speciesSearch}
          onChange={(e) => setSpeciesSearch(e.target.value)}
          placeholder="Search species…"
          className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors mb-3 min-h-[44px]"
        />

        {/* List */}
        <AnimatePresence mode="popLayout">
          {filteredCatches.length > 0 ? (
            <div className="space-y-2.5">
              {filteredCatches.map((c) => (
                <CatchCard
                  key={c.id}
                  catch_={c}
                  onClick={() => setSelectedCatch(c)}
                  onDelete={() => handleDelete(c.id)}
                  competitionName={
                    c.competition_id ? competitionMap[c.competition_id] : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-angler-white rounded-[14px] border border-angler-border py-12 text-center"
            >
              <div className="text-5xl mb-3">🪝</div>
              <p className="text-angler-text2 text-[13px] font-medium">
                No catches yet.
              </p>
              <p className="text-angler-text3 text-[12px] mt-1">
                Tap <span className="font-semibold text-angler-teal">Log Fish</span> to record your first.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        onDelete={handleDelete}
        competitionName={
          selectedCatch?.competition_id
            ? competitionMap[selectedCatch.competition_id]
            : undefined
        }
      />
    </div>
  )
}
