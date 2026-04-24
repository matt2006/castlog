import { motion } from 'framer-motion'
import { format } from 'date-fns'
import type { Catch } from '@/types'
import { getSpeciesEmoji } from '@/lib/species'

interface CatchCardProps {
  catch_: Catch
  onClick?: () => void
  onDelete?: () => void
  showAngler?: boolean
  competitionName?: string
  highlight?: boolean
}

export function CatchCard({
  catch_: c,
  onClick,
  onDelete,
  showAngler = false,
  competitionName,
  highlight = false,
}: CatchCardProps) {
  const emoji = getSpeciesEmoji(c.species)
  const weightDisplay =
    c.weight_kg >= 1
      ? `${c.weight_kg.toFixed(2)} kg`
      : `${Math.round(c.weight_kg * 1000)} g`

  const dateStr = format(new Date(c.timestamp), 'dd MMM yyyy')
  const metaBits = [c.method, dateStr].filter(Boolean) as string[]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[14px] px-3 py-3 shadow-card-light transition-transform active:scale-[0.99] ${
        highlight
          ? 'bg-angler-teal-l border border-angler-teal-m'
          : 'bg-angler-white border border-angler-border/60'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 44×44 icon tile */}
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-angler-teal-l flex-shrink-0 flex items-center justify-center">
        {c.photo_url ? (
          <img src={c.photo_url} alt={c.species} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl leading-none">{emoji}</span>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-angler-text leading-tight truncate">
          {c.species}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {metaBits.length > 0 && (
            <span className="text-[12px] text-angler-text2 leading-tight">
              {metaBits.join(' · ')}
            </span>
          )}
          {showAngler && c.profiles && (
            <span className="text-[12px] text-angler-text3 leading-tight">
              · {c.profiles.username}
            </span>
          )}
          {competitionName && (
            <span className="inline-flex bg-angler-teal-l text-angler-teal text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
              {competitionName}
            </span>
          )}
        </div>
        {c.location_name && (
          <p className="text-[11px] text-angler-text3 leading-tight mt-0.5 truncate">
            📍 {c.location_name}
          </p>
        )}
      </div>

      {/* Weight + length */}
      <div className="flex flex-col items-end flex-shrink-0 leading-tight">
        <span className="text-[17px] font-extrabold text-angler-teal tabular-nums">
          {weightDisplay}
        </span>
        {c.length_cm !== null && (
          <span className="text-[11px] text-angler-text3 tabular-nums mt-0.5">
            {c.length_cm} cm
          </span>
        )}
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label="Delete catch"
          className="w-8 h-8 flex items-center justify-center text-angler-text3 hover:text-red-500 transition-colors flex-shrink-0"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}
