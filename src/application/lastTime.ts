import { loadSessionHistory } from './historyIndex'
import { summarizeLastTime } from '../domain/session/lastTime'
import { formatWeight } from '../presentation/units'
import { readWeightUnit } from '../presentation/components/useWeightUnit'

// In-progress sessions have no SessionResult, so the current one is never
// counted as "last time" — only finished sessions are.
export async function getLastTimeSummary(exerciseId: string): Promise<string | null> {
  // The shared, cached history (historyIndex.ts): the Start screen asks
  // this once per move.
  const [{ plans, results, events }, unit] = await Promise.all([loadSessionHistory(), readWeightUnit()])
  if (results.length === 0) return null
  return summarizeLastTime(plans, results, events, exerciseId, (kg) => formatWeight(kg, unit))
}
