import type { SessionPlan, SessionResult } from '../../domain/session/types'
import { activityDate, type ActivityEntry } from '../../domain/progress/activities'

export type HistoryRow = SessionResult & { workoutName: string }

// Progress history: app workouts and other activities in one list, newest
// first. An activity sorts at local noon of its day (it has no time).
export type HistoryItem = { kind: 'workout'; row: HistoryRow } | { kind: 'activity'; activity: ActivityEntry }

export function mergeHistory(rows: readonly HistoryRow[], activities: readonly ActivityEntry[]): HistoryItem[] {
  const items: { at: number; item: HistoryItem }[] = [
    ...rows.map((row) => ({ at: Date.parse(row.endedAt), item: { kind: 'workout', row } as HistoryItem })),
    ...activities
      .filter((a) => a.deletedAt == null)
      .map((activity) => ({ at: activityDate(activity.day).getTime(), item: { kind: 'activity', activity } as HistoryItem })),
  ]
  return items.sort((a, b) => b.at - a.at).map((x) => x.item)
}

// Names each completed session from its plan's template, newest first.
// Plans come from the same snapshot as the results, so they're indexed in
// memory rather than re-read per session; templates are looked up once per
// distinct id. (Previously this issued one IndexedDB get per session.)
export async function buildHistoryRows(
  plans: SessionPlan[],
  results: SessionResult[],
  getTemplate: (templateId: string) => Promise<{ name: string } | undefined>
): Promise<HistoryRow[]> {
  const planById = new Map(plans.map((p) => [p.id, p]))
  const templateIds = [...new Set(results.map((r) => planById.get(r.planId)?.templateId).filter((id): id is string => !!id))]
  const templateNames = new Map(
    await Promise.all(templateIds.map(async (id) => [id, (await getTemplate(id))?.name] as const))
  )
  return [...results]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .map((result) => {
      const templateId = planById.get(result.planId)?.templateId
      return { ...result, workoutName: (templateId && templateNames.get(templateId)) || 'Workout' }
    })
}
