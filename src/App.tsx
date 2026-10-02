import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './presentation/theme/ThemeContext'
import { AppShell } from './presentation/layout/AppShell'
import { RouteFade } from './presentation/layout/RouteFade'
import { TodayScreen } from './presentation/screens/TodayScreen'
import { CheckInScreen } from './presentation/screens/CheckInScreen'
import { WorkoutPlayerScreen } from './presentation/screens/WorkoutPlayerScreen'
import { SessionCompleteScreen } from './presentation/screens/SessionCompleteScreen'
import { LibraryScreen } from './presentation/screens/LibraryScreen'
import { ProgressScreen } from './presentation/screens/ProgressScreen'
import { SettingsScreen } from './presentation/screens/SettingsScreen'
import { ProfilePickGate } from './presentation/components/ProfilePickGate'
import { OnboardingGate } from './presentation/components/OnboardingGate'

// Rarely-first screens: not a tab, not on the primary guided flow
// (Today -> Start -> Player -> Rest/Pause -> Complete -> Progress), so
// they're split into their own chunks instead of swelling the one every
// visit downloads. RouteFade's own Suspense boundary covers the brief gap
// (usually nothing — the service worker precaches every chunk) with a
// Skeleton, without unmounting the tab bar/ThumbBar around it.
const ScheduleScreen = lazy(() => import('./presentation/screens/ScheduleScreen').then((m) => ({ default: m.ScheduleScreen })))
const ExerciseDetailScreen = lazy(() =>
  import('./presentation/screens/ExerciseDetailScreen').then((m) => ({ default: m.ExerciseDetailScreen }))
)
const RoutineBuilderScreen = lazy(() =>
  import('./presentation/screens/RoutineBuilderScreen').then((m) => ({ default: m.RoutineBuilderScreen }))
)
const RoutineDetailScreen = lazy(() =>
  import('./presentation/screens/RoutineDetailScreen').then((m) => ({ default: m.RoutineDetailScreen }))
)
const ExerciseHistoryScreen = lazy(() =>
  import('./presentation/screens/ExerciseHistoryScreen').then((m) => ({ default: m.ExerciseHistoryScreen }))
)
const SessionDetailScreen = lazy(() =>
  import('./presentation/screens/SessionDetailScreen').then((m) => ({ default: m.SessionDetailScreen }))
)
const AboutScreen = lazy(() => import('./presentation/screens/AboutScreen').then((m) => ({ default: m.AboutScreen })))
const MeetRaeScreen = lazy(() => import('./presentation/screens/MeetRaeScreen').then((m) => ({ default: m.MeetRaeScreen })))
const PrivacyScreen = lazy(() => import('./presentation/screens/PrivacyScreen').then((m) => ({ default: m.PrivacyScreen })))
const TermsScreen = lazy(() => import('./presentation/screens/TermsScreen').then((m) => ({ default: m.TermsScreen })))
const LicensesScreen = lazy(() => import('./presentation/screens/LicensesScreen').then((m) => ({ default: m.LicensesScreen })))
const StoryScreen = lazy(() => import('./presentation/screens/StoryScreen').then((m) => ({ default: m.StoryScreen })))
const StoryChapterScreen = lazy(() =>
  import('./presentation/screens/StoryChapterScreen').then((m) => ({ default: m.StoryChapterScreen }))
)
const GardenScreen = lazy(() => import('./presentation/screens/GardenScreen').then((m) => ({ default: m.GardenScreen })))
const AchievementsScreen = lazy(() =>
  import('./presentation/screens/AchievementsScreen').then((m) => ({ default: m.AchievementsScreen }))
)
const RecapScreen = lazy(() => import('./presentation/screens/RecapScreen').then((m) => ({ default: m.RecapScreen })))
const RewardsScreen = lazy(() => import('./presentation/screens/RewardsScreen').then((m) => ({ default: m.RewardsScreen })))
const BossScreen = lazy(() => import('./presentation/screens/BossScreen').then((m) => ({ default: m.BossScreen })))

export default function App() {
  return (
    <ThemeProvider>
      <OnboardingGate />
      <ProfilePickGate />
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/schedule" element={<ScheduleScreen />} />
            <Route path="/exercise/:exerciseId" element={<ExerciseDetailScreen />} />
            <Route path="/routines/new" element={<RoutineBuilderScreen />} />
            <Route path="/routines/:templateId/edit" element={<RoutineBuilderScreen />} />
            <Route path="/routines/:templateId" element={<RoutineDetailScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/progress/:exerciseId" element={<ExerciseHistoryScreen />} />
            <Route path="/history/:sessionId" element={<SessionDetailScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/rewards" element={<RewardsScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="/licenses" element={<LicensesScreen />} />
            <Route path="/rae" element={<MeetRaeScreen />} />
            <Route path="/garden" element={<GardenScreen />} />
            <Route path="/achievements" element={<AchievementsScreen />} />
            <Route path="/boss" element={<BossScreen />} />
            <Route path="/story" element={<StoryScreen />} />
            <Route path="/story/:n" element={<StoryChapterScreen />} />
          </Route>
          {/* Full-screen flow outside the tab bar fades in the same way. */}
          <Route element={<RouteFade />}>
            <Route path="/checkin/:templateId" element={<CheckInScreen />} />
            <Route path="/session/:sessionId" element={<WorkoutPlayerScreen />} />
            <Route path="/session/:sessionId/complete" element={<SessionCompleteScreen />} />
            <Route path="/recap" element={<RecapScreen />} />
          </Route>
          {/* Preview merged into check-in; an old /preview link has no plan state. */}
          <Route path="/preview" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
