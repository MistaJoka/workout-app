import { describe, expect, it } from 'vitest'
import type { Exercise } from '../domain/content/types'
import { uniqueByLoop } from './libraryRows'

const ex = (id: string) => ({ id }) as Exercise

describe('uniqueByLoop', () => {
  it('keeps one exercise per Rae loop, first one wins, and keeps moves with no loop', () => {
    const loops: Record<string, string> = { 'fs.squat': 'squat', Bodyweight_Squat: 'squat', plank: 'plank' }
    const out = uniqueByLoop([ex('fs.squat'), ex('Bodyweight_Squat'), ex('plank'), ex('photo-only')], (id) => loops[id])
    expect(out.map((e) => e.id)).toEqual(['fs.squat', 'plank', 'photo-only'])
  })
})
