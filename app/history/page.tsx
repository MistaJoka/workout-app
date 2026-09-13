import Link from 'next/link'
import { getHistory } from '@/lib/actions/history'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const sessions = await getHistory()
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link href={`/history/${s.id}`} className="block rounded border p-4">
              <p className="font-semibold">{s.programDayName}</p>
              <p className="text-sm text-gray-500">
                {new Date(s.startedAt).toLocaleString()} — {s.totalSetsLogged} sets
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
