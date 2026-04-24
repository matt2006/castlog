import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

interface NavItem {
  icon: string
  label: string
  to: string
  end?: boolean
}

// URLs are stable; labels match the handoff (Users → Anglers, etc.).
const NAV_ITEMS: NavItem[] = [
  { icon: '🏠', label: 'Overview', to: '/admin', end: true },
  { icon: '👥', label: 'Anglers', to: '/admin/users' },
  { icon: '🏆', label: 'Events', to: '/admin/competitions' },
  { icon: '🐟', label: 'Catches', to: '/admin/catches' },
  { icon: '🎖️', label: 'Awards', to: '/admin/achievements' },
]

export function AdminLayout() {
  const profile = useStore((s) => s.profile)
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div
      data-theme="admin"
      className="min-h-screen bg-admin-bg text-admin-text font-sans flex"
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-60 bg-admin-bg2 border-r border-admin-border z-30">
        <div className="px-4 py-5 border-b border-admin-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎣</span>
            <div>
              <p className="font-extrabold text-admin-text text-sm leading-tight tracking-tight">
                Pyes Perchers
              </p>
              <p className="text-admin-teal text-[10px] font-bold uppercase tracking-[0.08em]">
                Admin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-admin-teal-dim text-admin-teal'
                    : 'text-admin-text2 hover:text-admin-text hover:bg-admin-bg3'
                }`
              }
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-admin-border flex flex-col gap-2">
          {profile && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: profile.avatar_color }}
              >
                {profile.avatar_emoji}
              </div>
              <div className="min-w-0">
                <p className="text-admin-text text-sm font-semibold truncate">
                  {profile.username}
                </p>
                <p className="text-admin-text3 text-xs">Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="btn-ghost text-sm py-2 px-3 w-full justify-start"
          >
            <span>🚪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-[calc(5rem+env(safe-area-inset-bottom,0))] md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — animated floating pill (framer-motion layoutId) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-admin-bg2 border-t border-admin-border z-30 pb-[env(safe-area-inset-bottom,0)]">
        <div className="grid grid-cols-5 h-20">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="relative flex items-center justify-center min-h-[44px]"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-tab-pill"
                      className="absolute inset-x-2 top-2 bottom-2 bg-admin-teal-dim rounded-[14px]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    <span className="text-[18px] leading-none">{item.icon}</span>
                    <span
                      className={`text-[10px] leading-none ${
                        isActive
                          ? 'font-bold text-admin-teal'
                          : 'font-normal text-admin-text3'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
