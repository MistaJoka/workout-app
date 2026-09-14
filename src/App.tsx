import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './presentation/theme/ThemeContext'
import { AppShell } from './presentation/layout/AppShell'
import { TodayScreen } from './presentation/screens/TodayScreen'
import { CheckInScreen } from './presentation/screens/CheckInScreen'
import { SessionPreviewScreen } from './presentation/screens/SessionPreviewScreen'
import { WorkoutPlayerScreen } from './presentation/screens/WorkoutPlayerScreen'
import { SessionCompleteScreen } from './presentation/screens/SessionCompleteScreen'
import { LibraryScreen } from './presentation/screens/LibraryScreen'
import { ProgressScreen } from './presentation/screens/ProgressScreen'
import { SettingsScreen } from './presentation/screens/SettingsScreen'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>
          <Route path="/checkin/:templateId" element={<CheckInScreen />} />
          <Route path="/preview" element={<SessionPreviewScreen />} />
          <Route path="/session/:sessionId" element={<WorkoutPlayerScreen />} />
          <Route path="/session/:sessionId/complete" element={<SessionCompleteScreen />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
