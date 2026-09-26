import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './presentation/theme/ThemeContext'
import { AppShell } from './presentation/layout/AppShell'
import { TodayScreen } from './presentation/screens/TodayScreen'
import { CheckInScreen } from './presentation/screens/CheckInScreen'
import { WorkoutPlayerScreen } from './presentation/screens/WorkoutPlayerScreen'
import { SessionCompleteScreen } from './presentation/screens/SessionCompleteScreen'
import { LibraryScreen } from './presentation/screens/LibraryScreen'
import { ScheduleScreen } from './presentation/screens/ScheduleScreen'
import { ExerciseDetailScreen } from './presentation/screens/ExerciseDetailScreen'
import { RoutineBuilderScreen } from './presentation/screens/RoutineBuilderScreen'
import { RoutineDetailScreen } from './presentation/screens/RoutineDetailScreen'
import { ProgressScreen } from './presentation/screens/ProgressScreen'
import { ExerciseHistoryScreen } from './presentation/screens/ExerciseHistoryScreen'
import { SettingsScreen } from './presentation/screens/SettingsScreen'
import { AboutScreen } from './presentation/screens/AboutScreen'

export default function App() {
  return (
    <ThemeProvider>
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
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/about" element={<AboutScreen />} />
          </Route>
          <Route path="/checkin/:templateId" element={<CheckInScreen />} />
          {/* Preview merged into check-in; an old /preview link has no plan state. */}
          <Route path="/preview" element={<Navigate to="/" replace />} />
          <Route path="/session/:sessionId" element={<WorkoutPlayerScreen />} />
          <Route path="/session/:sessionId/complete" element={<SessionCompleteScreen />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
