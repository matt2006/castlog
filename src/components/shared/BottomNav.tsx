import { NavLink } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  icon: string
  exact: boolean
  isLog?: boolean
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: '🏠', exact: true },
  { to: '/competitions', label: 'Compete', icon: '🏆', exact: false },
  { to: '/log', label: 'Log Fish', icon: '🐟', exact: false, isLog: true },
  { to: '/achievements', label: 'Medals', icon: '🎖️', exact: false },
]

export function BottomNav() {
  return (
    <nav
      data-theme="angler"
      className="fixed bottom-0 left-0 right-0 bg-angler-white border-t border-angler-border z-40 pb-[env(safe-area-inset-bottom,0)]"
    >
      <div className="flex items-stretch h-20">
        {tabs.map((tab) => {
          if (tab.isLog) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex-1 flex items-center justify-center"
              >
                <div className="inline-flex items-center gap-1.5 bg-angler-teal-l px-3 h-[26px] rounded-full min-w-[44px] justify-center">
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span className="text-angler-teal text-[13px] font-semibold leading-none">
                    {tab.label}
                  </span>
                </div>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 relative min-h-[44px] transition-colors ${
                  isActive ? 'text-angler-text' : 'text-angler-text3'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-lg leading-none">{tab.icon}</span>
                  <span className="text-[10px] font-bold tracking-wide leading-none">
                    {tab.label}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-t-full bg-angler-teal"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
