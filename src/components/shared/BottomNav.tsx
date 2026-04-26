import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Home, Trophy, History, Award, Plus, type LucideIcon } from 'lucide-react'

// ── Tab definition ────────────────────────────────────────────────────────────

interface TabDef {
  to: string
  label: string
  Icon: LucideIcon
  exact?: boolean
}

const LEFT_TABS: TabDef[] = [
  { to: '/', label: 'Home', Icon: Home, exact: true },
  { to: '/competitions', label: 'Compete', Icon: Trophy },
]

const RIGHT_TABS: TabDef[] = [
  { to: '/history', label: 'History', Icon: History },
  { to: '/achievements', label: 'Medals', Icon: Award },
]

// ── NavTab ────────────────────────────────────────────────────────────────────

function NavTab({ to, label, Icon, exact = false }: TabDef) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-colors min-h-[44px] ${
          isActive ? 'text-angler-forest' : 'text-angler-text3'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={24} strokeWidth={2} className="shrink-0" />
          <span className="text-[12px] font-medium leading-none">{label}</span>
          {isActive && (
            <span
              aria-hidden
              className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-angler-forest"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// ── FAB — diagnostic build ────────────────────────────────────────────────────

function Fab() {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      console.log('[FAB] ⚠️ ref.current is null — ref did not attach')
      return
    }

    // 1. Confirm portal placement
    console.log('[FAB] parentNode.nodeName:', el.parentNode?.nodeName)
    console.log('[FAB] parentElement tag:', el.parentElement?.tagName, '| class:', (el.parentElement?.className ?? '').toString().slice(0, 100))

    // 2. Position values
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    console.log('[FAB] getBoundingClientRect:', {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
    })
    console.log('[FAB] window.innerHeight:', window.innerHeight)
    console.log('[FAB] visualViewport height:', window.visualViewport?.height, '| offsetTop:', window.visualViewport?.offsetTop)
    console.log('[FAB] computed position:', cs.position)
    console.log('[FAB] computed bottom (resolved px):', cs.bottom)

    // 3. offsetParent — null = correct for position:fixed; non-null = containing block bug
    const op = el.offsetParent as HTMLElement | null
    if (op) {
      const ops = getComputedStyle(op)
      console.log('[FAB] ⚠️ offsetParent (should be null for fixed):', op.tagName, '| class:', op.className?.toString().slice(0, 100))
      console.log('[FAB] offsetParent computed:', {
        position: ops.position,
        transform: ops.transform,
        filter: ops.filter,
        perspective: ops.perspective,
        willChange: ops.willChange,
        contain: ops.contain,
        backdropFilter: ops.backdropFilter,
      })
    } else {
      console.log('[FAB] offsetParent: null ✓ (correct for position:fixed)')
    }

    // 4. Walk ancestor chain from FAB up to <html> looking for containing-block creators
    console.log('[FAB] === ancestor scan (FAB → html) ===')
    let node: HTMLElement | null = el.parentElement
    while (node) {
      const s = getComputedStyle(node)
      const flags: Record<string, string> = {}
      if (s.transform && s.transform !== 'none') flags.transform = s.transform
      if (s.filter && s.filter !== 'none') flags.filter = s.filter
      if (s.perspective && s.perspective !== 'none') flags.perspective = s.perspective
      if (s.willChange && s.willChange !== 'auto') flags.willChange = s.willChange
      if (s.contain && s.contain !== 'none') flags.contain = s.contain
      if (s.backdropFilter && s.backdropFilter !== 'none') flags.backdropFilter = s.backdropFilter
      // Also log non-static position even if not a transform-type issue
      const label = `<${node.tagName}${node.id ? '#' + node.id : ''}> class="${node.className?.toString().slice(0, 60)}"`
      if (Object.keys(flags).length) {
        console.log('[FAB] ⚠️ CONTAINING BLOCK CANDIDATE:', label, flags)
      } else {
        console.log('[FAB]   ancestor ok:', label, '| position:', s.position)
      }
      node = node.parentElement
    }
    console.log('[FAB] === end ancestor scan ===')

    // 5. Also probe the app container (in case the portal went somewhere unexpected)
    ;[
      '[data-theme="angler"]',
      'main',
      'nav',
      '#root',
    ].forEach((sel) => {
      const el2 = document.querySelector(sel) as HTMLElement | null
      if (!el2) return
      const s = getComputedStyle(el2)
      console.log(`[FAB] app element ${sel}:`, {
        position: s.position,
        transform: s.transform,
        filter: s.filter,
        willChange: s.willChange,
        contain: s.contain,
        overflow: s.overflow,
        overflowY: s.overflowY,
        height: s.height,
        minHeight: s.minHeight,
      })
    })

    // 6. Scroll diagnostics (debounced 150 ms, catches scroll in any container)
    let scrollTimer: ReturnType<typeof setTimeout> | null = null
    const logScroll = (source: string) => {
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        const r = el.getBoundingClientRect()
        console.log(`[FAB scroll – ${source}]`, {
          'rect.top': Math.round(r.top),
          'rect.bottom': Math.round(r.bottom),
          'window.innerHeight': window.innerHeight,
          'vv.height': window.visualViewport?.height,
          'vv.offsetTop': window.visualViewport?.offsetTop,
          'dist from vp bottom': Math.round(window.innerHeight - r.bottom),
        })
      }, 150)
    }

    const onWinScroll = () => logScroll('window')
    const onDocScroll = () => logScroll('document-capture')
    const mainEl = document.querySelector('main')
    const onMainScroll = () => logScroll('main')

    window.addEventListener('scroll', onWinScroll, { passive: true })
    document.addEventListener('scroll', onDocScroll, { passive: true, capture: true })
    mainEl?.addEventListener('scroll', onMainScroll, { passive: true })

    window.visualViewport?.addEventListener('resize', () => {
      console.log('[FAB vv resize]', {
        'vv.height': window.visualViewport?.height,
        'vv.offsetTop': window.visualViewport?.offsetTop,
        'rect.bottom': Math.round(el.getBoundingClientRect().bottom),
      })
    })

    return () => {
      window.removeEventListener('scroll', onWinScroll)
      document.removeEventListener('scroll', onDocScroll, { capture: true })
      mainEl?.removeEventListener('scroll', onMainScroll)
      if (scrollTimer) clearTimeout(scrollTimer)
    }
  }, [])

  return (
    <Link
      ref={ref}
      to="/log"
      aria-label="Log a catch"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-angler-forest shadow-elevated-light flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={28} strokeWidth={2.5} className="text-white" aria-hidden />
    </Link>
  )
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

export function BottomNav() {
  return (
    <>
      {createPortal(<Fab />, document.body)}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-angler-white border-t border-angler-border pb-[env(safe-area-inset-bottom,0)]">
        <div className="flex items-stretch h-16">
          {LEFT_TABS.map((tab) => (
            <NavTab key={tab.to} {...tab} />
          ))}
          <div className="w-16 shrink-0" aria-hidden="true" />
          {RIGHT_TABS.map((tab) => (
            <NavTab key={tab.to} {...tab} />
          ))}
        </div>
      </nav>
    </>
  )
}
