import type { Exercise, WorkoutTemplate } from './types'
import {
  exerciseById as curatedById,
  foundationStrengthStarterTemplates,
  templateById as curatedTemplateById,
} from './fixtures/foundationStrengthStarter'
import { getCustomTemplate, listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  return curatedTemplateById.get(id) ?? (await getCustomTemplate(id))
}

export async function listAllTemplates(): Promise<{ curated: WorkoutTemplate[]; custom: WorkoutTemplate[] }> {
  return { curated: foundationStrengthStarterTemplates, custom: await listCustomTemplates() }
}

let libraryPromise: Promise<Exercise[]> | null = null

// The full library is loaded on demand so the Today/Workout paths never pay
// for it; curated exercises resolve synchronously from the bundled pack.
export function loadLibrary(): Promise<Exercise[]> {
  if (!libraryPromise) {
    libraryPromise = import('./generated/libraryExercises.json').then((m) => m.default as Exercise[])
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
