import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession, getLoggedSets } from '@/lib/actions/sessions'
import { getProgramDay } from '@/lib/actions/programs'

export default async function SessionHistoryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const session = await getSession(sessionId).catch(() => null)
  if (!session) notFound()

  const [day, sets] = await Promise.all([getProgramDay(session.program_day_id), getLoggedSets(sessionId)])
  const exerciseById = new Map(day.exercises.map((e) => [e.id, e]))

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{day.name}</h1>
      <p className="text-sm text-gray-500">{new Date(session.started_at).toLocaleString()}</p>
      <ul className="space-y-1">
        {sets.map((set) => {
          const exercise = exerciseById.get(set.program_exercise_id)
          return (
            <li key={set.id} className="text-sm">
              {exercise ? (
                <Link href={`/history/exercise/${encodeURIComponent(exercise.exercise_name)}`} className="underline">
                  {exercise.exercise_name}
                </Link>
              ) : (
                'Exercise'
              )}{' '}
              — set {set.set_number}: {set.actual_weight ?? '-'} lb x {set.actual_reps ?? '-'}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
