import type { ReactNode } from 'react'

const SIZE = 216
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// The share of this rest still left, as a ring around the countdown. Pure
// decoration over the numeric timer inside it (the source of truth), driven
// by the persisted rest timestamps; motion settings only stop it gliding.
export function RestRing({
  restStartedAt,
  restEndsAt,
  seconds,
  children,
}: {
  restStartedAt: string | null
  restEndsAt: string
  seconds: number
  children: ReactNode
}) {
  const totalMs = restStartedAt ? Date.parse(restEndsAt) - Date.parse(restStartedAt) : 0
  const left = totalMs > 0 ? Math.min(1, Math.max(0, (seconds * 1000) / totalMs)) : 0
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
        <circle className="rest-ring__track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} />
        {totalMs > 0 && (
          <circle
            className="rest-ring__fill"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - left)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
