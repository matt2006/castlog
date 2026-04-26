import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import type { Venue } from '@/types'

export function VenueDirectory() {
  const navigate = useNavigate()
  const venues = useStore((s) => s.venues)
  const catches = useStore((s) => s.catches)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Venue | null>(null)

  // Count user's catches per venue
  const catchesByVenue = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of catches) {
      if (c.venue_id) map[c.venue_id] = (map[c.venue_id] ?? 0) + 1
    }
    return map
  }, [catches])

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

  const selectedCatchCount = selected ? (catchesByVenue[selected.id] ?? 0) : 0

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
              const count = catchesByVenue[v.id] ?? 0
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

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center sm:justify-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-angler-bg rounded-t-[24px] sm:rounded-[24px] sm:border sm:border-angler-border shadow-sheet w-full sm:max-w-md p-5 pb-[calc(env(safe-area-inset-bottom,0)+1.25rem)] relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 text-angler-text2 hover:text-angler-text min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>

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

              <div className="grid grid-cols-2 gap-2 mb-4">
                {selected.size_description && (
                  <div className="bg-angler-white rounded-[12px] border border-angler-border p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                      Size
                    </p>
                    <p className="text-angler-text font-bold text-[14px] mt-1">
                      {selected.size_description}
                    </p>
                  </div>
                )}
                {selected.fish_types && (
                  <div className={`bg-angler-white rounded-[12px] border border-angler-border p-3 ${!selected.size_description ? 'col-span-2' : ''}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                      Fish Types
                    </p>
                    <p className="text-angler-teal font-bold text-[14px] mt-1">
                      {selected.fish_types}
                    </p>
                  </div>
                )}
                {selected.notes && (
                  <div className="bg-angler-white rounded-[12px] border border-angler-border p-3 col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                      Notes
                    </p>
                    <p className="text-angler-text font-bold text-[14px] mt-1">{selected.notes}</p>
                  </div>
                )}
              </div>

              {selectedCatchCount > 0 ? (
                <button
                  onClick={() => navigate(`/?venue=${selected.id}`)}
                  className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[14px] min-h-[44px]"
                >
                  View my {selectedCatchCount}{' '}
                  {selectedCatchCount === 1 ? 'catch' : 'catches'} here
                </button>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
