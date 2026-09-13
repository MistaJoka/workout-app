import { getProgramDays } from '@/lib/actions/programs'
import { startSessionAndRedirect } from '@/lib/actions/sessions'

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  const days = await getProgramDays(programId)

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Program</h1>
      <ul className="space-y-4">
        {days.map((day) => (
          <li key={day.id} className="rounded border p-4 space-y-2">
            <p className="font-semibold">{day.name}</p>
            <ul className="text-sm text-gray-500">
              {day.exercises.map((e) => (
                <li key={e.id}>
                  {e.exercise_name} — {e.target_sets}x{e.target_reps}
                </li>
              ))}
            </ul>
            <form action={startSessionAndRedirect.bind(null, day.id)}>
              <button className="rounded bg-black px-4 py-2 text-white" type="submit">
                Start Workout
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
