import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SPECIES } from '@/lib/species'
import { useStore } from '@/store/useStore'
import type { Species } from '@/types'

type CategoryFilter = 'All' | 'Coarse' | 'Game' | 'Sea'

const CATEGORY_META: Record<Species['category'], { label: string; tint: string }> = {
  coarse: { label: 'Coarse', tint: 'bg-angler-teal-l text-angler-teal' },
  game: { label: 'Game', tint: 'bg-angler-purple-l text-angler-purple' },
  sea: { label: 'Sea', tint: 'bg-blue-400/10 text-blue-600' },
}

export function SpeciesGuide() {
  const navigate = useNavigate()
  const catches = useStore((s) => s.catches)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [selected, setSelected] = useState<Species | null>(null)

  // Lock body scroll while the detail sheet is open
  useEffect(() => {
    if (!selected) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [selected])

  const caughtCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of catches) map[c.species] = (map[c.species] ?? 0) + 1
    return map
  }, [catches])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return SPECIES.filter((s) => {
      if (category !== 'All' && s.category !== category.toLowerCase()) return false
      if (q && !s.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, category])

  const tabs: CategoryFilter[] = ['All', 'Coarse', 'Game', 'Sea']

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
            Species Guide
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
          placeholder="Search species…"
          className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[16px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
        />

        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setCategory(t)}
              className={`flex-shrink-0 px-4 h-10 rounded-full text-[13px] font-semibold min-h-[44px] transition-all ${
                category === t
                  ? 'bg-angler-teal text-white shadow-card-light'
                  : 'bg-angler-white text-angler-text2 border border-angler-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-angler-white border border-angler-border rounded-[14px] py-12 text-center">
            <div className="text-4xl mb-2">🔎</div>
            <p className="text-angler-text2 text-[13px] font-medium">
              No species match your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map((s) => {
              const count = caughtCounts[s.name] ?? 0
              const meta = CATEGORY_META[s.category]
              return (
                <button
                  key={s.name}
                  onClick={() => setSelected(s)}
                  className="bg-angler-white border border-angler-border/60 rounded-[14px] shadow-card-light p-3 flex gap-3 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 rounded-[12px] bg-angler-teal-l flex items-center justify-center text-2xl flex-shrink-0">
                    {s.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-angler-text text-[14px] leading-tight truncate">
                        {s.name}
                      </p>
                      {count > 0 && (
                        <span className="bg-angler-teal-l text-angler-teal text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${meta.tint}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-angler-text3 text-[11px] truncate">
                        {s.habitat}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

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
              className="bg-angler-bg rounded-t-[24px] sm:rounded-[24px] sm:border sm:border-angler-border shadow-sheet w-full sm:max-w-md p-5 pb-[calc(env(safe-area-inset-bottom,0)+1.25rem)] relative h-[85vh] overflow-y-auto overscroll-contain"
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
                  {selected.emoji}
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-angler-text text-[20px] leading-tight tracking-tight">
                    {selected.name}
                  </h2>
                  <span
                    className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                      CATEGORY_META[selected.category].tint
                    }`}
                  >
                    {CATEGORY_META[selected.category].label}
                  </span>
                </div>
              </div>

              <p className="text-angler-text2 text-[14px] leading-relaxed mb-4">
                {selected.description}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-angler-white rounded-[12px] border border-angler-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                    Avg Weight
                  </p>
                  <p className="text-angler-text font-bold text-[14px] mt-1">
                    {selected.avgWeight}
                  </p>
                </div>
                <div className="bg-angler-white rounded-[12px] border border-angler-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                    British Record
                  </p>
                  <p className="text-angler-teal font-bold text-[14px] mt-1">
                    {selected.britishRecord}
                  </p>
                </div>
                <div className="bg-angler-white rounded-[12px] border border-angler-border p-3 col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                    Habitat
                  </p>
                  <p className="text-angler-text font-bold text-[14px] mt-1">{selected.habitat}</p>
                </div>
              </div>

              {(caughtCounts[selected.name] ?? 0) > 0 ? (
                <button
                  onClick={() => navigate(`/?species=${encodeURIComponent(selected.name)}`)}
                  className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[14px] min-h-[44px]"
                >
                  View my {caughtCounts[selected.name]}{' '}
                  {caughtCounts[selected.name] === 1 ? 'catch' : 'catches'}
                </button>
              ) : (
                <div className="bg-angler-white border border-angler-border rounded-[12px] p-3 text-center text-angler-text3 text-[13px]">
                  You haven't caught one yet.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
