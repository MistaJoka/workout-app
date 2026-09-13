import { getExerciseHistory } from '@/lib/actions/history'

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseName: string }>
}) {
  const { exerciseName } = await params
  const decodedName = decodeURIComponent(exerciseName)
  const points = await getExerciseHistory(decodedName)

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{decodedName}</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th>Date</th>
            <th>Weight</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{new Date(p.completedAt).toLocaleDateString()}</td>
              <td>{p.actualWeight ?? '-'}</td>
              <td>{p.actualReps ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
