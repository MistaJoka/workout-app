import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/nunito'
import './index.css'
import { registerServiceWorker } from './presentation/pwa/registerServiceWorker'
import { requestPersistentStorage } from './presentation/pwa/storagePersistence'
import { listenForAppLinks } from './presentation/pwa/appLinks'
import { listenForReminders } from './infrastructure/reminders'
import { ErrorBoundary } from './presentation/components/ErrorBoundary'
import { OfflineBanner } from './presentation/components/OfflineBanner'
import { UpdateToast } from './presentation/components/UpdateToast'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <OfflineBanner />
      <UpdateToast />
      <App />
    </ErrorBoundary>
  </StrictMode>
)

registerServiceWorker()
void requestPersistentStorage()
void listenForAppLinks()
void listenForReminders()
