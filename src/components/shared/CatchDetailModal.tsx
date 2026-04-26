import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { getSpeciesEmoji } from '@/lib/species'
import type { Catch } from '@/types'

interface CatchDetailModalProps {
  catch_: Catch | null
  onClose: () => void
  onDelete?: (id: string) => void | Promise<void>
  readOnly?: boolean
  competitionName?: string
}

export function CatchDetailModal({
  catch_: c,
  onClose,
  onDelete,
  readOnly = false,
  competitionName,
}: CatchDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Open on mount when a catch is provided; close when it clears.
  useEffect(() => {
    setIsOpen(c !== null)
  }, [c])

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const close = () => setIsOpen(false)

  const handleDelete = async () => {
    if (!c || !onDelete) return
    await onDelete(c.id)
    close()
  }

  const emoji = c ? getSpeciesEmoji(c.species) : '🎣'
  const dateStr = c ? format(new Date(c.timestamp), 'dd MMM yyyy · HH:mm') : ''

  const tiles = c
    ? [
        { label: 'Length', value: c.length_cm !== null ? `${c.length_cm} cm` : '—', icon: '📏' },
        { label: 'Method', value: c.method || '—', icon: '🎣' },
        { label: 'Location', value: c.location_name || '—', icon: '📍' },
        {
          label: 'Competition',
          value: competitionName || (c.competition_id ? 'Assigned' : 'None'),
          icon: '🏆',
        },
      ]
    : []

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {isOpen && c && (
        <motion.div
          key="backdrop"
          data-theme="angler"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/50 flex items-end"
          onClick={close}
        >
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-angler-white rounded-t-[28px] shadow-sheet max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Photo hero */}
            <div className="relative w-full aspect-[4/3] flex-shrink-0 bg-angler-bg2">
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt={c.species}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-3"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, oklch(0.92 0.01 80) 0px, oklch(0.92 0.01 80) 10px, oklch(0.88 0.01 80) 10px, oklch(0.88 0.01 80) 11px)',
                  }}
                >
                  <div className="text-[56px] leading-none">{emoji}</div>
                  <div className="text-angler-text3 text-[13px] font-medium">
                    No photo attached
                  </div>
                </div>
              )}

              {/* Close button (glass) */}
              <button
                onClick={close}
                aria-label="Close"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/40 backdrop-blur-[8px] min-h-[44px] min-w-[44px] hover:bg-black/55 transition-colors"
              >
                <span className="text-base leading-none">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0)+2rem)]">
              {/* Title + weight */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h2 className="text-[26px] font-extrabold text-angler-text tracking-[-0.02em] leading-tight truncate">
                    {c.species}
                  </h2>
                  <div className="text-angler-text3 text-[13px] mt-1">{dateStr}</div>
                </div>
                <div className="text-right flex-shrink-0 leading-tight">
                  <div className="text-[30px] font-extrabold text-angler-teal tracking-[-0.03em] tabular-nums">
                    {c.weight_kg.toFixed(2)}
                  </div>
                  <div className="text-angler-text3 text-[13px] font-semibold">kg</div>
                </div>
              </div>

              {/* Detail tiles */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {tiles.map((d) => (
                  <div
                    key={d.label}
                    className="bg-angler-bg border border-angler-border rounded-[14px] px-3.5 py-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[13px] leading-none">{d.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-angler-text3">
                        {d.label}
                      </span>
                    </div>
                    <div className="text-angler-text font-bold text-[14px] leading-tight break-words">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              {!readOnly && onDelete && (
                <button
                  onClick={handleDelete}
                  className="w-full py-3.5 rounded-[14px] border-[1.5px] border-red-500 text-red-500 font-bold text-[15px] flex items-center justify-center gap-2 min-h-[44px] bg-transparent hover:bg-red-500/5 transition-colors"
                >
                  <span className="text-base leading-none">✕</span>
                  Delete Catch
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
