import { Link } from 'react-router-dom'

// The panel joined to the bottom of Rae's room: the one thing to do today.
// Exactly one state shows, in this priority: resume a workout in progress,
// today's finished workout, a rest day, or what's up next. Each state has
// one primary action.

export type MissionThumb = { src: string; alt: string; rae?: boolean }

export type Mission =
  | {
      kind: 'ready'
      tag: string
      name: string
      detail: string
      thumbs: MissionThumb[]
      to: string
    }
  | { kind: 'resume'; name: string; current: string; done: number; total: number; to: string }
  | { kind: 'done'; name: string; detail: string; extra: { name: string; to: string } | null }
  | { kind: 'rest'; extra: { name: string; to: string } | null }

const FIELD: Record<Mission['kind'], string> = {
  ready: 'bg-field-primary',
  resume: 'bg-field-calm',
  done: 'bg-field-success',
  rest: 'bg-field-calm',
}

export function TodayMission({ mission }: { mission: Mission }) {
  return (
    <div className={`today-mission ${FIELD[mission.kind]} p-4 space-y-3`}>
      {mission.kind === 'ready' && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-tight">{mission.name}</p>
              <p className="text-sm text-ink-muted">{mission.detail}</p>
            </div>
            <span className="badge-primary mt-1 flex-none">{mission.tag}</span>
          </div>
          {mission.thumbs.length > 0 && (
            // What's coming, as the movements themselves rather than a list
            // of names. Decorative: the names are on the next screen.
            <div className="flex -space-x-2" aria-hidden>
              {mission.thumbs.slice(0, 6).map((thumb) => (
                <img
                  key={thumb.src}
                  src={thumb.src}
                  alt=""
                  loading="lazy"
                  className={`h-11 w-11 rounded-full border-2 border-surface ${
                    thumb.rae ? 'bg-surface object-contain p-0.5 pixelated' : 'object-cover'
                  }`}
                />
              ))}
            </div>
          )}
          <Link to={mission.to} className="btn-primary btn-lg w-full">
            Start workout
          </Link>
        </>
      )}

      {mission.kind === 'resume' && (
        <>
          <div>
            <p className="text-2xl font-extrabold leading-tight">{mission.name}</p>
            <p className="text-sm text-ink-muted">
              {mission.done} of {mission.total} sets done. Next: {mission.current}
            </p>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-label="Workout progress"
            aria-valuemin={0}
            aria-valuemax={mission.total}
            aria-valuenow={mission.done}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${(mission.done / Math.max(1, mission.total)) * 100}%` }} />
          </div>
          <Link to={mission.to} className="btn-primary btn-lg w-full">
            Resume workout
          </Link>
        </>
      )}

      {mission.kind === 'done' && (
        <>
          <div className="flex items-center gap-3">
            <span className="today-mission__check flex h-12 w-12 flex-none items-center justify-center rounded-full bg-surface text-2xl" aria-hidden>
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-tight">Done for today</p>
              <p className="text-sm text-ink-muted">
                {mission.name}, {mission.detail}
              </p>
            </div>
          </div>
          {mission.extra && (
            <Link to={mission.extra.to} className="btn-secondary w-full">
              Want more? {mission.extra.name}
            </Link>
          )}
        </>
      )}

      {mission.kind === 'rest' && (
        <>
          <div>
            <p className="text-2xl font-extrabold leading-tight">Rest day</p>
            <p className="text-sm text-ink-muted">Recovery is part of the plan.</p>
          </div>
          {mission.extra && (
            <Link to={mission.extra.to} className="btn-secondary w-full">
              {mission.extra.name} anyway
            </Link>
          )}
        </>
      )}
    </div>
  )
}
