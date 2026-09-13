import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { getProgramDay } from '@/lib/actions/programs'
import { ActiveSessionClient } from '@/components/session/ActiveSessionClient'
import type { SessionPlan } from '@/lib/session-machine'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const session = await getSession(sessionId).catch(() => null)
  if (!session) notFound()

  const day = await getProgramDay(session.program_day_id)
  const plan: SessionPlan = {
    exercises: day.exercises.map((e) => ({
      id: e.id,
      name: e.exercise_name,
      targetSets: e.target_sets,
      targetReps: e.target_reps,
      targetRestSeconds: e.target_rest_seconds,
    })),
  }

  return (
    <main>
      <h1 className="p-4 text-lg font-semibold">{day.name}</h1>
      <ActiveSessionClient sessionId={sessionId} plan={plan} />
    </main>
  )
}
