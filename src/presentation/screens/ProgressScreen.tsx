import { useEffect, useState } from 'react'
import { db } from '../../infrastructure/db/schema'
import type { SessionResult } from '../../domain/session/types'

export function ProgressScreen() {
  const [results, setResults] = useState<SessionResult[] | null>(null)

  useEffect(() => {
    db.sessionResults.toArray().then((all) => setResults([...all].sort((a, b) => b.endedAt.localeCompare(a.endedAt))))
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>
      {results === null && <p className="text-ink-muted">Loading…</p>}
      {results && results.length === 0 && <p className="text-ink-muted">No completed sessions yet.</p>}
      <ul className="space-y-2">
        {results?.map((result) => (
          <li key={result.sessionId} className="rounded-panel border border-edge bg-surface p-3">
            <p className="text-sm">{new Date(result.endedAt).toLocaleString()}</p>
            <p className="text-sm text-ink-muted">
              {result.totalSetsCompleted}/{result.totalSetsPlanned} sets — {result.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
