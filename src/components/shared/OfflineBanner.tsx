import { useStore } from '@/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'

export function OfflineBanner() {
  const isOnline = useStore((s) => s.isOnline)
  const offlineQueue = useStore((s) => s.offlineQueue)

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">⚠️</span>
            <p className="text-amber-300 text-sm font-medium">You're offline</p>
          </div>
          {offlineQueue.length > 0 && (
            <span className="text-amber-400 text-xs">
              {offlineQueue.length} catch{offlineQueue.length !== 1 ? 'es' : ''} queued
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
