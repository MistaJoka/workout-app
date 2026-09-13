import Link from 'next/link'
import { getPrograms } from '@/lib/actions/programs'
import { getHistory } from '@/lib/actions/history'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [programs, history] = await Promise.all([getPrograms(), getHistory()])
  const inProgressSession = history.find((s) => s.endedAt === null)

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Workout App</h1>
      {inProgressSession && (
        <Link
          href={`/session/${inProgressSession.id}`}
          className="block rounded border border-black p-4 font-semibold"
        >
          Continue last session — {inProgressSession.programDayName}
        </Link>
      )}
      <ul className="space-y-2">
        {programs.map((program) => (
          <li key={program.id}>
            <Link href={`/programs/${program.id}`} className="block rounded border p-4">
              <p className="font-semibold">{program.name}</p>
              {program.description && <p className="text-sm text-gray-500">{program.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/history" className="block text-sm underline">
        View history
      </Link>
    </main>
  )
}
