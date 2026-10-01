import { useEffect, useState } from 'react'
import { getEventsForSession, getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { flowStatus } from '../../domain/session/flow'

// A small pixel-style badge for a session where every planned set counted
// and every one of them was met (flowStatus.perfect, domain/session/flow.ts)
// — no skips, no fallen-short sets. Read fresh from the stored plan/events,
// like the rest of this screen; renders nothing while loading, on a read
// failure, or when the session wasn't perfect (never a "so close" message —
// CLAUDE.md: celebrate, never shame).
export function PerfectStamp({ sessionId }: { sessionId: string }) {
  const [perfect, setPerfect] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getPlan(sessionId), getEventsForSession(sessionId)])
      .then(([plan, events]) => {
        if (!cancelled && plan) setPerfect(flowStatus(plan, events).perfect)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (!perfect) return null
  return (
    <p className="perfect-stamp perfect-stamp--pop mx-auto" role="status" data-testid="perfect-stamp">
      <style>{STYLE}</style>
      <span aria-hidden="true">✦</span> Perfect workout! <span aria-hidden="true">✦</span>
    </p>
  )
}

const STYLE = `
.perfect-stamp {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 10px;
  background: #ffe08a;
  color: #5a3a1a;
  font-weight: 800;
  font-size: 0.95rem;
  box-shadow: 0 0 0 2px #f5b942, 0 0 0 4px #fff6d8;
}
@keyframes perfect-stamp-pop {
  0% { transform: scale(0.5) rotate(-6deg); opacity: 0; }
  70% { transform: scale(1.1) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
[data-motion='full'] .perfect-stamp--pop { animation: perfect-stamp-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }
[data-motion='reduced'] .perfect-stamp--pop,
[data-motion='off'] .perfect-stamp--pop { animation: none; }
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .perfect-stamp--pop { animation: none; }
}
`
