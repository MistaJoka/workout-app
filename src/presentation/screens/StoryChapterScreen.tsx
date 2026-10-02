import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RAE_STORY } from '../../domain/content/raeStory'
import { db } from '../../infrastructure/db/schema'
import { BackButton } from '../components/BackButton'
import { RaeFace, type RaeExpression } from '../components/Rae'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'
import { markChapterSeen } from '../storySeen'

// One chapter of Rae's garden story: her face for that chapter, the
// paragraphs, and a way to the next one once it's earned. Marks itself
// read (per profile) the moment an unlocked chapter is actually opened —
// never before, so "unlocked" and "read" stay honest.
export function StoryChapterScreen() {
  const { n } = useParams<{ n: string }>()
  const chapter = RAE_STORY.find((c) => c.n === Number(n))
  const [finishedCount, setFinishedCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    db.sessionResults
      .toArray()
      .then((results) => {
        if (!cancelled) setFinishedCount(results.length)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const unlocked = chapter != null && finishedCount != null && chapter.unlockAt <= finishedCount

  useEffect(() => {
    if (unlocked && chapter) markChapterSeen(chapter.n)
  }, [unlocked, chapter])

  if (!chapter) {
    return (
      <div className="p-4 space-y-4">
        <BackButton label="Story" />
        <p className="font-bold">That chapter doesn't exist yet.</p>
        <Link to="/story" className="btn-primary block w-full text-center">
          Back to the story
        </Link>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton label="Story" />
        <p className="font-bold">Couldn't load your workouts.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    )
  }

  if (finishedCount === null) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <SkeletonBlock className="h-40 rounded-panel" />
      </Skeleton>
    )
  }

  if (!unlocked) {
    return (
      <div className="p-4 space-y-4">
        <BackButton label="Story" />
        <p className="font-bold">This chapter hasn't unlocked yet.</p>
        <p className="text-sm text-ink-muted">
          Unlocks after {chapter.unlockAt} {chapter.unlockAt === 1 ? 'workout' : 'workouts'}.
        </p>
        <Link to="/story" className="btn-secondary block w-full text-center">
          Back to the story
        </Link>
      </div>
    )
  }

  const next = RAE_STORY.find((c) => c.n === chapter.n + 1)
  const nextUnlocked = next != null && next.unlockAt <= finishedCount

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton label="Story" />
      <div className="flex items-center gap-3">
        <RaeFace expression={chapter.expression as RaeExpression} size={56} motion="bob" decorative />
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">
            Chapter {chapter.n} of {RAE_STORY.length}
          </p>
          <h1 className="text-xl font-bold leading-tight">{chapter.title}</h1>
        </div>
      </div>
      <div className="card space-y-3 p-4">
        {chapter.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      {next && nextUnlocked && (
        <Link to={`/story/${next.n}`} className="btn-primary block w-full text-center">
          Next chapter
        </Link>
      )}
      {next && !nextUnlocked && (
        <p className="text-center text-sm text-ink-muted">
          Next chapter unlocks after {next.unlockAt} {next.unlockAt === 1 ? 'workout' : 'workouts'}.
        </p>
      )}
      {!next && <p className="text-center text-sm text-ink-muted">That's the story so far. More to come.</p>}
    </div>
  )
}
