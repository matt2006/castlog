import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Login } from '@/pages/Login'
import { ChangePassword } from '@/pages/ChangePassword'
import { AnglerLayout } from '@/pages/angler/AnglerLayout'
import { Home } from '@/pages/angler/Home'
import { CompetitionsScreen } from '@/pages/angler/CompetitionsScreen'
import { LogCatch } from '@/pages/angler/LogCatch'
import { AchievementsScreen } from '@/pages/angler/AchievementsScreen'
import { CompetitionDetailScreen } from '@/pages/angler/CompetitionDetailScreen'
import { SpeciesGuide } from '@/pages/angler/SpeciesGuide'
import { CatchMap } from '@/pages/angler/CatchMap'
import { VenueDirectory } from '@/pages/angler/VenueDirectory'
import { Settings } from '@/pages/angler/Settings'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Angler app */}
      <Route element={<AuthGuard />}>
        <Route element={<AnglerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/competitions" element={<CompetitionsScreen />} />
          <Route path="/competitions/:id" element={<CompetitionDetailScreen />} />
          <Route path="/log" element={<LogCatch />} />
          <Route path="/achievements" element={<AchievementsScreen />} />
          <Route path="/species" element={<SpeciesGuide />} />
          <Route path="/map" element={<CatchMap />} />
          <Route path="/venues" element={<VenueDirectory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

<Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
