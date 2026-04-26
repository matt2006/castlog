import { createPortal } from 'react-dom'
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

// ── FAB (portal-rendered so position:fixed is always viewport-relative) ───────

function Fab() {
  return (
    <Link
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
      {/* FAB: mounted at document.body via portal so position:fixed is always
          relative to the ICB (viewport), bypassing any ancestor overflow/transform
          quirks including iOS Safari PWA fixed-positioning edge cases. */}
      {createPortal(<Fab />, document.body)}

      {/* Nav strip */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-angler-white border-t border-angler-border pb-[env(safe-area-inset-bottom,0)]">
        <div className="flex items-stretch h-16">
          {LEFT_TABS.map((tab) => (
            <NavTab key={tab.to} {...tab} />
          ))}

          {/* 64 px gap keeps left and right tab pairs visually symmetric under the FAB */}
          <div className="w-16 shrink-0" aria-hidden="true" />

          {RIGHT_TABS.map((tab) => (
            <NavTab key={tab.to} {...tab} />
          ))}
        </div>
      </nav>
    </>
  )
}
