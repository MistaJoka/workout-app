import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportAll } from '../../infrastructure/exportImport/exportImport'
import { downloadBackup } from '../../infrastructure/exportImport/downloadBackup'

type State = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error in the app', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen bg-bg p-4 text-ink">
        <div className="card mt-8 space-y-3 p-4">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="text-sm text-ink-muted">Your data is still on this device. Reload to keep going, or save a backup first.</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => location.reload()}>
              Reload
            </button>
            <button
              className="btn-secondary flex-1"
              onClick={() => {
                void exportAll().then(downloadBackup).catch(() => {})
              }}
            >
              Export a backup
            </button>
          </div>
        </div>
      </div>
    )
  }
}
