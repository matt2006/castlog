import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
import { ACHIEVEMENTS, RARITY_ORDER } from '@/lib/achievements'
import type { Achievement, AchievementEarned, Rarity } from '@/types'

const RARITY_TEXT: Record<Rarity, string> = {
  legendary: 'text-angler-gold',
  epic: 'text-angler-purple',
  rare: 'text-blue-500',
  common: 'text-angler-text3',
}

const RARITY_BORDER: Record<Rarity, string> = {
  legendary: 'border-angler-gold/40',
  epic: 'border-angler-purple/40',
  rare: 'border-blue-400/40',
  common: 'border-angler-border',
}

const RARITY_BG: Record<Rarity, string> = {
  legendary: 'bg-angler-gold-l',
  epic: 'bg-angler-purple-l',
  rare: 'bg-blue-400/10',
  common: 'bg-angler-bg2',
}

const RARITY_FILL: Record<Rarity, string> = {
  legendary: 'bg-angler-gold',
  epic: 'bg-angler-purple',
  rare: 'bg-blue-500',
  common: 'bg-angler-text3',
}

const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'common']

interface AchievementToast {
  achievement: Achievement
  earnedAt: string
}

export function AchievementsScreen() {
  const catches = useStore((s) => s.catches)
  const earnedAchievements = useStore((s) => s.earnedAchievements)

  const [toasts, setToasts] = useState<AchievementToast[]>([])
  const prevEarnedRef = useRef<AchievementEarned[]>([])

  useEffect(() => {
    const prev = prevEarnedRef.current
    if (prev.length > 0 && earnedAchievements.length > prev.length) {
      const prevIds = new Set(prev.map((a) => a.achievement_id))
      const newOnes = earnedAchievements.filter((a) => !prevIds.has(a.achievement_id))
      for (const earned of newOnes) {
        const ach = ACHIEVEMENTS.find((a) => a.id === earned.achievement_id)
        if (ach) {
          setToasts((prev) => [...prev, { achievement: ach, earnedAt: earned.earned_at }])
        }
      }
    }
    prevEarnedRef.current = earnedAchievements
  }, [earnedAchievements])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [toasts])

  const earnedMap = useMemo(
    () => new Map(earnedAchievements.map((a) => [a.achievement_id, a])),
    [earnedAchievements]
  )
  const earnedCount = earnedAchievements.length

  const rarityTotals = useMemo(() => {
    const totals: Record<Rarity, { earned: number; total: number }> = {
      legendary: { earned: 0, total: 0 },
      epic: { earned: 0, total: 0 },
      rare: { earned: 0, total: 0 },
      common: { earned: 0, total: 0 },
    }
    for (const a of ACHIEVEMENTS) {
      totals[a.rarity].total++
      if (earnedMap.has(a.id)) totals[a.rarity].earned++
    }
    return totals
  }, [earnedMap])

  const sortedAchievements = useMemo(
    () =>
      [...ACHIEVEMENTS].sort((a, b) => {
        const aEarned = earnedMap.has(a.id)
        const bEarned = earnedMap.has(b.id)
        if (aEarned !== bEarned) return aEarned ? -1 : 1
        return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
      }),
    [earnedMap]
  )

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-4">
      {/* Unlock toasts */}
      <div className="fixed top-4 left-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={`${toast.achievement.id}-${toast.earnedAt}`}
              layout
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className={`bg-angler-white border rounded-[14px] p-3 flex items-center gap-3 shadow-elevated-light pointer-events-auto ${
                RARITY_BORDER[toast.achievement.rarity]
              }`}
            >
              <span className="text-2xl">{toast.achievement.icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-extrabold text-[13px] leading-tight ${
                    RARITY_TEXT[toast.achievement.rarity]
                  }`}
                >
                  🎖 {toast.achievement.name} unlocked!
                </p>
                <p className="text-angler-text2 text-[11px] mt-0.5 leading-tight">
                  {toast.achievement.description}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  RARITY_TEXT[toast.achievement.rarity]
                }`}
              >
                {toast.achievement.rarity}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header>
        <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">Medals</h1>
        <p className="text-[13px] font-semibold text-angler-teal mt-0.5 tabular-nums">
          {earnedCount}
          <span className="text-angler-text3 font-medium"> / {ACHIEVEMENTS.length} unlocked</span>
        </p>
      </header>

      {/* Rarity breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {RARITIES.map((r) => {
          const t = rarityTotals[r]
          return (
            <div
              key={r}
              className={`rounded-[12px] border px-2 py-2.5 text-center ${RARITY_BORDER[r]} ${RARITY_BG[r]}`}
            >
              <p className={`text-[11px] font-bold uppercase tracking-wide ${RARITY_TEXT[r]}`}>
                {r}
              </p>
              <p className="text-angler-text font-extrabold text-[15px] mt-0.5 tabular-nums">
                {t.earned}
                <span className="text-angler-text3 font-semibold text-[12px]"> / {t.total}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {sortedAchievements.map((ach) => {
          const earned = earnedMap.get(ach.id)
          const isEarned = !!earned
          const progress = !isEarned && ach.progress ? ach.progress(catches) : null
          const pct = progress ? Math.min((progress.current / progress.max) * 100, 100) : 0

          return (
            <motion.div
              key={ach.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: isEarned ? 1 : 0.7, scale: 1 }}
              className={`relative rounded-[14px] border p-3.5 flex flex-col items-center text-center gap-1.5 ${
                isEarned ? `${RARITY_BORDER[ach.rarity]} ${RARITY_BG[ach.rarity]}` : 'border-angler-border bg-angler-white'
              }`}
            >
              {isEarned && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-angler-gold text-white text-[11px] font-black flex items-center justify-center shadow-card-light">
                  ✓
                </span>
              )}

              <span
                className={`text-[36px] leading-none ${
                  isEarned ? RARITY_TEXT[ach.rarity] : 'grayscale opacity-40'
                }`}
              >
                {ach.icon}
              </span>

              <p
                className={`font-bold text-[13px] leading-tight ${
                  isEarned ? 'text-angler-text' : 'text-angler-text2'
                }`}
              >
                {ach.name}
              </p>

              <p className="text-angler-text3 text-[11px] leading-tight">{ach.description}</p>

              <span className={`text-[11px] font-bold uppercase tracking-wide ${RARITY_TEXT[ach.rarity]}`}>
                {ach.rarity}
              </span>

              {isEarned && (
                <span className="text-angler-text3 text-[10px] mt-0.5">
                  {format(new Date(earned.earned_at), 'dd MMM yyyy')}
                </span>
              )}

              {progress && (
                <div className="w-full mt-1">
                  <div className="flex justify-between text-[10px] text-angler-text3 tabular-nums mb-1">
                    <span>{progress.current}</span>
                    <span>{progress.max}</span>
                  </div>
                  <div className="w-full h-[3px] bg-angler-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${RARITY_FILL[ach.rarity]}`}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
