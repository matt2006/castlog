import { Navigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'

// Section stub — placeholder until Phase C fills each section
function SectionStub({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-angler-white rounded-[18px] shadow-card-light p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[22px] leading-none">{icon}</span>
        <h2 className="font-bold text-angler-text text-[17px] leading-tight">{title}</h2>
      </div>
      <p className="text-angler-text3 text-[13px]">{description}</p>
      <div className="mt-4 bg-angler-bg2 rounded-[12px] py-8 text-center text-angler-text3 text-[12px]">
        Coming in Phase C
      </div>
    </div>
  )
}

export function Settings() {
  const profile = useStore((s) => s.profile)

  // Admin-only — redirect anyone who sneaks here directly
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-4">
      <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
        Admin Settings
      </h1>

      <SectionStub
        icon="👥"
        title="Anglers"
        description="Create, rename, and manage all angler accounts. Grant or revoke admin role. Reset passwords."
      />

      <SectionStub
        icon="📍"
        title="Venues"
        description="Add, edit, and delete fishing venues available to all anglers and competitions."
      />

      <SectionStub
        icon="🎖️"
        title="Achievements"
        description="View earned achievements, revoke incorrectly granted ones, and manually grant achievements."
      />

      <SectionStub
        icon="🐟"
        title="Catches"
        description="Browse and bulk-manage all catch records across every angler."
      />

      <SectionStub
        icon="🏠"
        title="App Overview"
        description="Total anglers, catches, active competitions, and weight logged."
      />
    </div>
  )
}
