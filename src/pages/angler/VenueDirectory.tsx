import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import { getSpeciesEmoji } from '@/lib/species'
import { CatchDetailModal } from '@/components/shared/CatchDetailModal'
import type { Catch, Venue } from '@/types'

type DetailTab = 'about' | 'history'

export function VenueDirectory() {
  const navigate = useNavigate()
  const venues = useStore((s) => s.venues)
  const catches = useStore((s) => s.catches)       // current user's catches only
  const profile = useStore((s) => s.profile)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Venue | null>(null)
  const [tab, setTab] = useState<DetailTab>('about')

  // All catches at the selected venue (fetched when detail opens)
  const [venueCatches, setVenueCatches] = useState<Catch[]>([])
  const [catchesLoading, setCatchesLoading] = useState(false)

  // Catch detail modal
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null)

  // Count current user's catches per venue (for the card badge — instant, no query)
  const myCatchesByVenue = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of catches) {
      if (c.venue_id) map[c.venue_id] = (map[c.venue_id] ?? 0) + 1
    }
    return map
  }, [catches])

  // Fetch all catches at the selected venue when it opens
  useEffect(() => {
    if (!selected) return
    setTab('about')
    setVenueCatches([])
    setCatchesLoading(true)

    supabase
      .from('catches')
      .select('*, profiles(username, avatar_emoji, avatar_color)')
      .eq('venue_id', selected.id)
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        setVenueCatches((data as Catch[]) ?? [])
        setCatchesLoading(false)
      })
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return venues
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.location_text ?? '').toLowerCase().includes(q) ||
        (v.fish_types ?? '').toLowerCase().includes(q)
    )
  }, [venues, query])

  // My catches at the selected venue (derived from fetched venueCatches)
  const myVenueCatchCount = selected
    ? venueCatches.filter((c) => c.angler_id === profile?.id).length
    : 0

  return (
    <div className="min-h-full">
      <header className="bg-angler-white px-5 pt-[calc(env(safe-area-inset-top,0)+0.75rem)] pb-3 sticky top-0 z-20 border-b border-angler-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-angler-text2 hover:text-angler-text min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-xl"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="font-extrabold text-angler-text text-[20px] tracking-tight">
            Venues
          </h1>
          <span className="ml-auto text-angler-text3 text-[13px] font-semibold tabular-nums">
            {filtered.length}
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3 pb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venues…"
          className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[14px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
        />

        {filtered.length === 0 ? (
          <div className="bg-angler-white border border-angler-border rounded-[14px] py-12 text-center">
            <div className="text-4xl mb-2">🔎</div>
            <p className="text-angler-text2 text-[13px] font-medium">No venues match your search.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((v) => {
              const count = myCatchesByVenue[v.id] ?? 0
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className="bg-angler-white border border-angler-border/60 rounded-[14px] shadow-card-light p-3.5 flex gap-3 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 rounded-[12px] bg-angler-teal-l flex items-center justify-center text-2xl flex-shrink-0">
                    🎣
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-angler-text text-[14px] leading-tight">
                        {v.name}
                      </p>
                      {count > 0 && (
                        <span className="bg-angler-teal-l text-angler-teal text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                          {count}
                        </span>
                      )}
                    </div>
                    {v.location_text && (
                      <p className="text-angler-text3 text-[12px] mt-0.5 truncate">{v.location_text}</p>
                    )}
                    {v.fish_types && (
                      <p className="text-angler-text2 text-[11px] mt-0.5 truncate">{v.fish_types}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-angler-bg rounded-t-[24px] sm:rounded-[24px] sm:border sm:border-angler-border shadow-sheet w-full sm:max-w-md relative h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 z-10 text-angler-text2 hover:text-angler-text min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Fixed header — venue identity */}
              <div className="px-5 pt-5 pb-0 flex-shrink-0">
                <div className="flex items-center gap-3 mb-4 pr-10">
                  <div className="w-16 h-16 rounded-[16px] bg-angler-teal-l flex items-center justify-center text-[36px] flex-shrink-0">
                    🎣
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-angler-text text-[20px] leading-tight tracking-tight">
                      {selected.name}
                    </h2>
                    {selected.location_text && (
                      <p className="text-angler-text3 text-[13px] mt-0.5">{selected.location_text}</p>
                    )}
                  </div>
                </div>

                {/* Tab pills */}
                <div className="flex gap-1.5 pb-3">
                  {(['about', 'history'] as DetailTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 h-10 rounded-[10px] text-[13px] font-semibold transition-all min-h-[44px] capitalize ${
                        tab === t
                          ? 'bg-angler-teal text-white shadow-card-light'
                          : 'bg-angler-white text-angler-text2 border border-angler-border'
                      }`}
                    >
                      {t === 'history'
                        ? catchesLoading
                          ? 'History…'
                          : `History${venueCatches.length > 0 ? ` (${venueCatches.length})` : ''}`
                        : 'About'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable tab content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0)+1.25rem)]">
                {tab === 'about' && (
                  <AboutTab
                    venue={selected}
                    venueCatches={venueCatches}
                    catchesLoading={catchesLoading}
                    myCount={myVenueCatchCount}
                    onDeepLink={() => navigate(`/?venue=${selected.id}`)}
                  />
                )}
                {tab === 'history' && (
                  <HistoryTab
                    catches={venueCatches}
                    loading={catchesLoading}
                    onSelectCatch={setSelectedCatch}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catch detail modal — read-only (browsing context) */}
      <CatchDetailModal
        catch_={selectedCatch}
        onClose={() => setSelectedCatch(null)}
        readOnly
      />
    </div>
  )
}

// ── About tab ────────────────────────────────────────────────────────────────

function AboutTab({
  venue,
  venueCatches,
  catchesLoading,
  myCount,
  onDeepLink,
}: {
  venue: Venue
  venueCatches: Catch[]
  catchesLoading: boolean
  myCount: number
  onDeepLink: () => void
}) {
  const totalCount = venueCatches.length

  return (
    <div className="space-y-2 pt-1 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {/* Catches logged — global stat */}
        <div className="bg-angler-white rounded-[12px] border border-angler-border p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
            Catches Logged
          </p>
          <p className="text-angler-teal font-extrabold text-[18px] mt-1 tabular-nums">
            {catchesLoading ? (
              <span className="inline-block w-4 h-4 rounded-full border-2 border-angler-teal border-t-transparent animate-spin align-middle" />
            ) : (
              totalCount
            )}
          </p>
        </div>

        {venue.size_description ? (
          <div className="bg-angler-white rounded-[12px] border border-angler-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
              Size
            </p>
            <p className="text-angler-text font-bold text-[14px] mt-1">
              {venue.size_description}
            </p>
          </div>
        ) : (
          // Keep the grid even if no size
          <div />
        )}

        {venue.fish_types && (
          <div className="bg-angler-white rounded-[12px] border border-angler-border p-3 col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
              Fish Types
            </p>
            <p className="text-angler-teal font-bold text-[14px] mt-1">
              {venue.fish_types}
            </p>
          </div>
        )}

        {venue.notes && (
          <div className="bg-angler-white rounded-[12px] border border-angler-border p-3 col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
              Notes
            </p>
            <p className="text-angler-text font-bold text-[14px] mt-1">{venue.notes}</p>
          </div>
        )}
      </div>

      {/* Deep-link button — only shown when the user has personal catches here */}
      {!catchesLoading && myCount > 0 && (
        <button
          onClick={onDeepLink}
          className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[14px] min-h-[44px] mt-2"
        >
          View my {myCount} {myCount === 1 ? 'catch' : 'catches'} here
        </button>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  catches,
  loading,
  onSelectCatch,
}: {
  catches: Catch[]
  loading: boolean
  onSelectCatch: (c: Catch) => void
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-angler-teal border-t-transparent animate-spin" />
      </div>
    )
  }

  if (catches.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-[40px] mb-3">🪝</div>
        <p className="text-angler-text2 text-[14px] font-semibold">No catches logged here yet.</p>
        <p className="text-angler-text3 text-[12px] mt-1">Be the first to log one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-1">
      {catches.map((c) => {
        const avatar = c.profiles
        const ago = formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })

        return (
          <button
            key={c.id}
            onClick={() => onSelectCatch(c)}
            className="w-full flex items-center gap-3 bg-angler-white border border-angler-border/60 rounded-[14px] px-3 py-3 shadow-card-light text-left active:scale-[0.98] transition-transform"
          >
            {/* Species icon */}
            <div className="w-11 h-11 rounded-[10px] bg-angler-teal-l flex items-center justify-center text-[22px] leading-none flex-shrink-0">
              {getSpeciesEmoji(c.species)}
            </div>

            {/* Middle: species + weight/length */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-angler-text text-[14px] leading-tight truncate">
                {c.species}
              </p>
              <p className="text-angler-text3 text-[11px] mt-0.5 tabular-nums">
                {c.weight_kg.toFixed(2)} kg
                {c.length_cm !== null ? ` · ${c.length_cm} cm` : ''}
              </p>
            </div>

            {/* Right: angler + time */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {avatar ? (
                <div className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] leading-none flex-shrink-0"
                    style={{ backgroundColor: avatar.avatar_color }}
                  >
                    {avatar.avatar_emoji}
                  </div>
                  <span className="text-angler-text2 text-[11px] font-medium max-w-[72px] truncate">
                    {avatar.username}
                  </span>
                </div>
              ) : null}
              <span className="text-angler-text3 text-[10px]">{ago}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
