import type { Exercise, WorkoutTemplate } from './types'
import {
  exerciseById as starterById,
  foundationStrengthStarterTemplates,
  templateById as curatedTemplateById,
} from './fixtures/foundationStrengthStarter'
import { raeChairMoveById, raeChairMoves } from './fixtures/raeChairMoves'
import { getCustomTemplate, listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  return curatedTemplateById.get(id) ?? (await getCustomTemplate(id))
}

export async function listAllTemplates(): Promise<{ curated: WorkoutTemplate[]; custom: WorkoutTemplate[] }> {
  return { curated: foundationStrengthStarterTemplates, custom: await listCustomTemplates() }
}

// Bundled exercises resolve synchronously: the starter pack plus Rae's chair
// moves (which have no library record of their own).
const curatedById: ReadonlyMap<string, Exercise> = new Map([...starterById, ...raeChairMoveById])

let libraryPromise: Promise<Exercise[]> | null = null

// The full library is loaded on demand so the Today/Workout paths never pay
// for it; curated exercises resolve synchronously from the bundled pack.
export function loadLibrary(): Promise<Exercise[]> {
  if (!libraryPromise) {
    // Rae's chair moves lead the list so they are searchable and usable in
    // the routine builder like any library exercise.
    libraryPromise = import('./generated/libraryExercises.json').then((m) => [
      ...raeChairMoves,
      ...(m.default as Exercise[]),
    ])
  }
  return libraryPromise
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const curated = curatedById.get(id)
  if (curated) return curated
  if (!id.startsWith('lib.')) return undefined
  const library = await loadLibrary()
  return library.find((e) => e.id === id)
}

export async function getExercises(ids: readonly string[]): Promise<Map<string, Exercise>> {
  const result = new Map<string, Exercise>()
  const missing: string[] = []
  for (const id of ids) {
    const curated = curatedById.get(id)
    if (curated) result.set(id, curated)
    else missing.push(id)
  }
  if (missing.length > 0) {
    const library = await loadLibrary()
    for (const e of library) {
      if (missing.includes(e.id)) result.set(e.id, e)
    }
  }
  return result
}
