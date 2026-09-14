import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getResult } from '../../infrastructure/db/repositories/sessionRepository'
import type { SessionResult } from '../../domain/session/types'

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getResult(sessionId).then((loaded) => setResult(loaded ?? null))
  }, [sessionId])

  return (
    <div className="p-6 text-center space-y-4">
      <p className="text-xl font-semibold">Workout complete</p>
      {result && (
        <p className="text-ink-muted">
          {result.totalSetsCompleted} of {result.totalSetsPlanned} sets completed
          {result.status === 'COMPLETED_SHORTENED' ? ' (ended early)' : ''}
        </p>
      )}
      <Link to="/" className="inline-block rounded-panel bg-primary px-4 py-2 text-white">
        Back to Today
      </Link>
    </div>
  )
}
