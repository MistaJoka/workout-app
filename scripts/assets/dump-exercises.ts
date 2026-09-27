// Print exercises as JSON, by id, from wherever they live (starter pack,
// Rae's own moves, or the generated library). Used by rae-redraw-prompts.py.
import { readFileSync } from 'node:fs'
import { exerciseById as starter } from '../../src/domain/content/fixtures/foundationStrengthStarter'
import { raeMoveById } from '../../src/domain/content/fixtures/raeMoves'
import type { Exercise } from '../../src/domain/content/types'

const library: Exercise[] = JSON.parse(readFileSync('src/domain/content/generated/libraryExercises.json', 'utf8'))
const byId = new Map<string, Exercise>([...library.map((e) => [e.id, e] as const), ...starter, ...raeMoveById])
const ids = process.argv.slice(2)
console.log(JSON.stringify(ids.map((id) => byId.get(id) ?? null)))
