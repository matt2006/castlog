import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AdminGuard } from '@/components/auth/AdminGuard'
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
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminOverview } from '@/pages/admin/AdminOverview'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminCompetitions } from '@/pages/admin/AdminCompetitions'
import { AdminCatches } from '@/pages/admin/AdminCatches'
import { AdminAchievements } from '@/pages/admin/AdminAchievements'
import { AdminVenues } from '@/pages/admin/AdminVenues'
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

      {/* Admin dashboard */}
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="competitions" element={<AdminCompetitions />} />
          <Route path="catches" element={<AdminCatches />} />
          <Route path="achievements" element={<AdminAchievements />} />
          <Route path="venues" element={<AdminVenues />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
