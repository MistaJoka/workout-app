import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RAE_STORY, nextChapter, unlockedChapters } from '../../domain/content/raeStory'
import { db } from '../../infrastructure/db/schema'
import { BackButton } from '../components/BackButton'
import { RaeFace, type RaeExpression } from '../components/Rae'
import { Skeleton, SkeletonBlock, SkeletonHeading, SkeletonList } from '../components/Skeleton'
import { isChapterSeen } from '../storySeen'

type Snapshot = {
  finishedCount: number
  unlockedIds: ReadonlySet<number>
  unreadIds: ReadonlySet<number>
}

async function load(): Promise<Snapshot> {
  const results = await db.sessionResults.toArray()
  const unlockedIds = new Set(unlockedChapters(results.length).map((c) => c.n))
  const unreadIds = new Set([...unlockedIds].filter((n) => !isChapterSeen(n)))
  return { finishedCount: results.length, unlockedIds, unreadIds }
}

// The chapter list: every chapter Rae's garden story will tell, unlocked
// ones openable with their read state, locked ones a soft invitation ("find
// out after N more workouts") rather than a wall. Nothing here can be lost
// or missed — a chapter just waits until it's earned.
export function StoryScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    load()
      .then((loaded) => {
        if (!cancelled) setSnapshot(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (failed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load Rae's story.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <SkeletonBlock className="h-4 w-1/2 rounded-full" />
        <SkeletonList rows={6} thumb />
      </Skeleton>
    )
  }

  const upcoming = nextChapter(snapshot.finishedCount)
  const remaining = upcoming ? Math.max(0, upcoming.unlockAt - snapshot.finishedCount) : 0

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">Rae's story</h1>
        <p className="text-sm text-ink-muted">
          {snapshot.unlockedIds.size} of {RAE_STORY.length} chapters
          {upcoming ? ` · ${remaining} more ${remaining === 1 ? 'workout' : 'workouts'} to the next one` : ' · the whole story, so far'}
        </p>
      </div>
      <ul className="space-y-2">
        {RAE_STORY.map((chapter) => {
          const unlocked = snapshot.unlockedIds.has(chapter.n)
          const unread = snapshot.unreadIds.has(chapter.n)
          if (unlocked) {
            return (
              <li key={chapter.n}>
                <Link
                  to={`/story/${chapter.n}`}
                  className="card flex min-h-11 items-center gap-3 px-4 py-3 active:bg-field-primary"
                  aria-label={`Chapter ${chapter.n}: ${chapter.title}${unread ? ', new, unread' : ', read'}`}
                >
                  <RaeFace expression={chapter.expression as RaeExpression} size={40} motion="none" decorative />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{chapter.title}</span>
                    <span className="block text-xs text-ink-muted">Chapter {chapter.n}</span>
                  </span>
                  {unread && <NewTag />}
                  <span aria-hidden="true" className="text-xl text-ink-muted">
                    ›
                  </span>
                </Link>
              </li>
            )
          }
          return (
            <li
              key={chapter.n}
              className="card flex min-h-11 items-center gap-3 border-dashed px-4 py-3"
              aria-label={`Chapter ${chapter.n}: ${chapter.title}, locked, unlocks after ${chapter.unlockAt} ${chapter.unlockAt === 1 ? 'workout' : 'workouts'}`}
            >
              <LockGlyph />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink-muted">{chapter.title}</span>
                <span className="block text-xs text-ink-muted">
                  Unlocks after {chapter.unlockAt} {chapter.unlockAt === 1 ? 'workout' : 'workouts'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NewTag() {
  return (
    <span className="flex-none rounded-full bg-field-success px-2 py-0.5 text-xs font-semibold text-ink-muted">New</span>
  )
}

// A small soft padlock, same pixel-grid style as the recap tiles' glyph —
// a gentle "not yet" rather than a warning.
function LockGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="28" height="28" shapeRendering="crispEdges" className="flex-none">
      <rect x="5" y="7" width="6" height="6" rx="1" fill="var(--color-border)" />
      <rect x="6" y="3" width="4" height="5" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
      <rect x="7" y="9" width="2" height="2" fill="var(--color-text-muted)" />
    </svg>
  )
}
