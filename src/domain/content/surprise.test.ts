import { describe, expect, it } from 'vitest'
import { lastMainTemplateId, pickSurprise, surprisePool } from './surprise'
import type { WorkoutTemplate } from './types'

const t = (id: string): WorkoutTemplate => ({ id, version: 1, name: id, packId: 'p', exercises: [] })

describe('surprisePool', () => {
  it('leaves out drafts and the last routine done', () => {
    const pool = surprisePool({
      curated: [t('a'), t('b'), t('draft')],
      custom: [t('mine')],
      herMix: t('her-mix'),
      lastTemplateId: 'a',
      draftIds: new Set(['draft']),
    })
    expect(pool.map((p) => p.id)).toEqual(['b', 'mine', 'her-mix'])
  })

  it('keeps the last routine when it is the only one left', () => {
    const pool = surprisePool({ curated: [t('a'), t('draft')], custom: [], herMix: null, lastTemplateId: 'a', draftIds: new Set(['draft']) })
    expect(pool.map((p) => p.id)).toEqual(['a'])
  })

  it('with no history, everything but drafts', () => {
    const pool = surprisePool({ curated: [t('a'), t('b')], custom: [], herMix: null, lastTemplateId: null, draftIds: new Set() })
    expect(pool).toHaveLength(2)
  })
})

describe('pickSurprise', () => {
  it('uses the injected random', () => {
    expect(pickSurprise([t('a'), t('b'), t('c')], () => 0.99)?.id).toBe('c')
    expect(pickSurprise([t('a'), t('b'), t('c')], () => 0)?.id).toBe('a')
  })

  it('returns null for an empty pool', () => {
    expect(pickSurprise([])).toBeNull()
  })
})

describe('lastMainTemplateId', () => {
  const plan = (id: string, templateId: string) => ({ id, templateId })
  const result = (planId: string, endedAt: string) => ({ planId, endedAt })
  it('skips a cool-down (a draft) done after the main workout', () => {
    const plans = [plan('p1', 'fs.full-body-a'), plan('p2', 'draft.cool-down')]
    const results = [result('p1', '2026-10-05T10:00:00.000Z'), result('p2', '2026-10-05T10:20:00.000Z')]
    expect(lastMainTemplateId(plans, results, new Set(['draft.cool-down']))).toBe('fs.full-body-a')
  })
  it('is null with no history', () => {
    expect(lastMainTemplateId([], [], new Set())).toBeNull()
  })
})
