import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/nunito'
import '@fontsource-variable/inter'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import './index.css'
import { registerServiceWorker } from './presentation/pwa/registerServiceWorker'
import { requestPersistentStorage } from './presentation/pwa/storagePersistence'
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
