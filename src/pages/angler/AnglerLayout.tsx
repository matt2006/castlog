import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/shared/BottomNav'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { useStore } from '@/store/useStore'

export function AnglerLayout() {
  const _location = useLocation()
  useEffect(() => {
    console.log('[Route] location changed to:', _location.pathname, '— key:', _location.key)
  }, [_location.pathname, _location.key])
  const catches = useStore((s) => s.catches)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (deferredPrompt && catches.length >= 2 && !dismissed) {
      setShowInstallBanner(true)
    }
  }, [deferredPrompt, catches.length, dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
    setShowInstallBanner(false)
    setDismissed(true)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    setDismissed(true)
  }

  return (
    <div
      data-theme="angler"
      className="min-h-screen bg-angler-bg text-angler-text flex flex-col font-sans"
    >
      <OfflineBanner />
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0))] overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-angler-white border border-angler-border rounded-[18px] p-4 shadow-elevated-light"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📲</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-angler-text text-sm leading-tight">
                  Add Pyes Perchers to your home screen?
                </p>
                <p className="text-angler-text2 text-xs mt-0.5">Quick access, works offline</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleDismiss}
                  className="text-angler-text2 text-sm font-semibold px-3 py-2 min-h-[44px]"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="bg-angler-teal text-white font-semibold text-sm px-4 py-2 rounded-xl min-h-[44px]"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
