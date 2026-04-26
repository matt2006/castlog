import { NavLink, Link } from 'react-router-dom'

function NavTab({
  to,
  label,
  icon,
  exact = false,
}: {
  to: string
  label: string
  icon: string
  exact?: boolean
}) {
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
          <span className="text-[22px] leading-none">{icon}</span>
          <span className="text-[12px] font-medium leading-none">{label}</span>
          {/* Active dot indicator */}
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

export function BottomNav() {
  return (
    <>
      {/* FAB — fixed, centred, raised ~16 px above the nav top border */}
      <Link
        to="/log"
        aria-label="Log a catch"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-angler-forest shadow-elevated-light flex items-center justify-center active:scale-95 transition-transform"
      >
        <span
          aria-hidden
          className="text-white text-[32px] font-light leading-none select-none mt-[-2px]"
        >
          +
        </span>
      </Link>

      {/* Nav strip */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-angler-white border-t border-angler-border pb-[env(safe-area-inset-bottom,0)]">
        <div className="flex items-stretch h-16">
          <NavTab to="/" label="Home" icon="🏠" exact />
          <NavTab to="/competitions" label="Compete" icon="🏆" />

          {/* Horizontal gap — reserves space under the FAB so flanking tabs are equal-width */}
          <div className="w-16 shrink-0" aria-hidden="true" />

          <NavTab to="/history" label="History" icon="📋" />
          <NavTab to="/achievements" label="Medals" icon="🎖️" />
        </div>
      </nav>
    </>
  )
}
