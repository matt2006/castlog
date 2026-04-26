import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Home, Trophy, History, Award, Plus, type LucideIcon } from 'lucide-react'

const FAB_SIZE = 56   // w-14 h-14 in px
const FAB_GAP  = 80   // desired distance from visual-viewport bottom to FAB bottom

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

// ── FAB ───────────────────────────────────────────────────────────────────────
// Rendered via createPortal so it is a direct child of <body>, guaranteeing
// position:fixed uses the ICB. VV anchoring keeps it at the visual-viewport
// bottom even when keyboard is open or the user has pinch-zoomed.

function Fab() {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      console.log('[FAB] ⚠️ ref.current is null — ref did not attach')
      return
    }

    // ── Diagnostic: mount ────────────────────────────────────────────────────
    console.log('[FAB] parentNode.nodeName:', el.parentNode?.nodeName)
    console.log('[FAB] parentElement tag:', el.parentElement?.tagName, '| class:', (el.parentElement?.className ?? '').toString().slice(0, 100))

    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    console.log('[FAB] getBoundingClientRect:', { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) })
    console.log('[FAB] window.innerHeight:', window.innerHeight)
    console.log('[FAB] visualViewport height:', window.visualViewport?.height, '| offsetTop:', window.visualViewport?.offsetTop)
    console.log('[FAB] computed position:', cs.position, '| computed bottom:', cs.bottom)

    const op = el.offsetParent as HTMLElement | null
    if (op) {
      const ops = getComputedStyle(op)
      console.log('[FAB] ⚠️ offsetParent (should be null):', op.tagName, op.className?.toString().slice(0, 80))
      console.log('[FAB] offsetParent computed:', { position: ops.position, transform: ops.transform, filter: ops.filter, willChange: ops.willChange, contain: ops.contain })
    } else {
      console.log('[FAB] offsetParent: null ✓')
    }

    console.log('[FAB] === ancestor scan ===')
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
      const tag = `<${node.tagName}> class="${node.className?.toString().slice(0, 50)}"`
      if (Object.keys(flags).length) console.log('[FAB] ⚠️ CANDIDATE:', tag, flags)
      else console.log('[FAB]  ok:', tag, '| position:', s.position)
      node = node.parentElement
    }
    console.log('[FAB] === end ancestor scan ===')
    ;['[data-theme="angler"]', 'main', 'nav', '#root'].forEach((sel) => {
      const el2 = document.querySelector(sel) as HTMLElement | null
      if (!el2) return
      const s = getComputedStyle(el2)
      console.log(`[FAB] app element ${sel}:`, { position: s.position, transform: s.transform, filter: s.filter, willChange: s.willChange, overflow: s.overflow, overflowY: s.overflowY, height: s.height })
    })
    // ── End diagnostic: mount ─────────────────────────────────────────────────

    const cleanups: (() => void)[] = []

    // ── VV anchoring fix ──────────────────────────────────────────────────────
    // Keeps FAB at visual-viewport bottom regardless of keyboard / pinch-zoom.
    // Falls back to the static CSS bottom value on browsers without VV API.
    if (window.visualViewport) {
      const positionFab = () => {
        const vv = window.visualViewport!
        // top in layout coords so FAB bottom sits FAB_GAP px above VV bottom
        const top  = vv.offsetTop + vv.height - FAB_SIZE - FAB_GAP
        // left in layout coords centred on the VV (overrides left-1/2 class)
        const left = vv.offsetLeft + vv.width / 2
        el.style.top    = `${top}px`
        el.style.bottom = 'auto'
        el.style.left   = `${left}px`

        // Diagnostic: log after each VV reposition
        console.log('[FAB VV position]', {
          'vv.offsetTop': Math.round(vv.offsetTop),
          'vv.height': Math.round(vv.height),
          'set top': Math.round(top),
          'set left': Math.round(left),
          'rect.bottom (pre-paint)': Math.round(el.getBoundingClientRect().bottom),
          'window.innerHeight': window.innerHeight,
        })
      }

      positionFab()
      window.visualViewport.addEventListener('resize', positionFab)
      window.visualViewport.addEventListener('scroll', positionFab)
      cleanups.push(() => {
        window.visualViewport!.removeEventListener('resize', positionFab)
        window.visualViewport!.removeEventListener('scroll', positionFab)
      })
    }

    // ── Diagnostic: scroll events ─────────────────────────────────────────────
    let scrollTimer: ReturnType<typeof setTimeout> | null = null
    const logScroll = (source: string) => {
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        const r = el.getBoundingClientRect()
        console.log(`[FAB scroll – ${source}]`, {
          'rect.bottom': Math.round(r.bottom),
          'window.innerHeight': window.innerHeight,
          'vv.height': window.visualViewport?.height,
          'vv.offsetTop': window.visualViewport?.offsetTop,
          'dist from vp bottom': Math.round(window.innerHeight - r.bottom),
        })
      }, 150)
    }
    const onWinScroll  = () => logScroll('window')
    const onDocScroll  = () => logScroll('document-capture')
    const mainEl = document.querySelector('main')
    const onMainScroll = () => logScroll('main')
    window.addEventListener('scroll', onWinScroll, { passive: true })
    document.addEventListener('scroll', onDocScroll, { passive: true, capture: true })
    mainEl?.addEventListener('scroll', onMainScroll, { passive: true })
    cleanups.push(() => {
      window.removeEventListener('scroll', onWinScroll)
      document.removeEventListener('scroll', onDocScroll, { capture: true })
      mainEl?.removeEventListener('scroll', onMainScroll)
      if (scrollTimer) clearTimeout(scrollTimer)
    })
    // ── End diagnostic: scroll ─────────────────────────────────────────────────

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return (
    <Link
      ref={ref}
      to="/log"
      aria-label="Log a catch"
      // Fallback position for browsers without window.visualViewport.
      // JS overrides top/left/bottom above when VV API is available.
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-angler-forest shadow-elevated-light flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={28} strokeWidth={2.5} className="text-white" aria-hidden />
    </Link>
  )
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

export function BottomNav() {
  const navRef = useRef<HTMLElement>(null)

  // VV anchoring for the nav strip — same principle as the FAB.
  // Without this, bottom:0 (layout coords) can also mismatch the visual viewport.
  useEffect(() => {
    const navEl = navRef.current
    if (!navEl || !window.visualViewport) return

    const positionNav = () => {
      const vv = window.visualViewport!
      const navH = navEl.offsetHeight   // includes safe-area pb
      navEl.style.top    = `${vv.offsetTop + vv.height - navH}px`
      navEl.style.bottom = 'auto'
    }

    positionNav()
    window.visualViewport.addEventListener('resize', positionNav)
    window.visualViewport.addEventListener('scroll', positionNav)

    return () => {
      window.visualViewport!.removeEventListener('resize', positionNav)
      window.visualViewport!.removeEventListener('scroll', positionNav)
    }
  }, [])

  return (
    <>
      {createPortal(<Fab />, document.body)}

      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-40 bg-angler-white border-t border-angler-border pb-[env(safe-area-inset-bottom,0)]"
      >
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
