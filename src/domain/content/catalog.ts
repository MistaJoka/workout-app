import type { Exercise, WorkoutTemplate } from './types'
import {
  exerciseById as starterById,
  foundationStrengthStarterTemplates,
  templateById as curatedTemplateById,
} from './fixtures/foundationStrengthStarter'
import { listedRaeMoves, raeMoveById } from './fixtures/raeMoves'
import { getCustomTemplate, listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'
import { listHearts } from '../../infrastructure/db/repositories/favoritesRepository'
import { buildHerMix, HER_MIX_ID } from './herMix'

// Her mix is built from hearts on every read (domain/content/herMix.ts):
// it exists only while at least three shown moves are hearted.
export async function getHerMix(): Promise<WorkoutTemplate | null> {
  const hearts = await listHearts()
  if (hearts.length === 0) return null
  const found = await getExercises(hearts.map((h) => h.exerciseId))
  return buildHerMix(hearts, (id) => found.get(id))
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  if (id === HER_MIX_ID) return (await getHerMix()) ?? undefined
  return curatedTemplateById.get(id) ?? (await getCustomTemplate(id))
}

export async function listAllTemplates(): Promise<{
  curated: WorkoutTemplate[]
  custom: WorkoutTemplate[]
  herMix: WorkoutTemplate | null
}> {
  const [custom, herMix] = await Promise.all([listCustomTemplates(), getHerMix()])
  return { curated: foundationStrengthStarterTemplates, custom, herMix }
}

// Bundled exercises resolve synchronously: the starter pack plus Rae's own
// moves (which have no library record of their own).
const curatedById: ReadonlyMap<string, Exercise> = new Map([...starterById, ...raeMoveById])

// Shares one in-flight/settled load, but forgets a rejected one: a failed
// chunk load (offline, or an old build's hash gone after an update) must not
// be replayed forever — the next call (e.g. a Retry button) loads again.
export function memoizeUntilRejected<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null
  return () => {
    if (!promise) {
      promise = load().catch((error: unknown) => {
        promise = null
        throw error
      })
    }
    return promise
  }
}

// The full library is loaded on demand so the Today/Workout paths never pay
// for it; curated exercises resolve synchronously from the bundled pack.
// Rae's own moves lead the list so they are searchable and usable in the
// routine builder like any library exercise.
export const loadLibrary: () => Promise<Exercise[]> = memoizeUntilRejected(() =>
  import('./generated/libraryExercises.json').then((m) => [...listedRaeMoves, ...(m.default as Exercise[])])
)

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
