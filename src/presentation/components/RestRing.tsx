import type { ReactNode } from 'react'

const STROKE = 12

// The share of a countdown still left (a rest, or a timed hold), as a ring
// around the number. Pure decoration over the numeric timer inside it (the
// source of truth), driven by persisted timestamps; motion settings only
// stop it gliding.
export function RestRing({
  restStartedAt,
  restEndsAt,
  seconds,
  size = 216,
  children,
}: {
  restStartedAt: string | null
  restEndsAt: string
  seconds: number
  size?: number
  children: ReactNode
}) {
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const totalMs = restStartedAt ? Date.parse(restEndsAt) - Date.parse(restStartedAt) : 0
  const left = totalMs > 0 ? Math.min(1, Math.max(0, (seconds * 1000) / totalMs)) : 0
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle className="rest-ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={STROKE} />
        {totalMs > 0 && (
          <circle
            className="rest-ring__fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - left)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
