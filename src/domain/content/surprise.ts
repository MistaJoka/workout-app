import type { WorkoutTemplate } from './types'

// Surprise me: any of her routines except drafts and the one she did last,
// unless that one is all there is. Plain random: a UI choice, not adaptation.
export function surprisePool(input: {
  curated: WorkoutTemplate[]
  custom: WorkoutTemplate[]
  herMix: WorkoutTemplate | null
  lastTemplateId: string | null
  draftIds: ReadonlySet<string>
}): WorkoutTemplate[] {
  const all = [...input.curated, ...input.custom, ...(input.herMix ? [input.herMix] : [])].filter(
    (t) => !input.draftIds.has(t.id)
  )
  const fresh = all.filter((t) => t.id !== input.lastTemplateId)
  return fresh.length > 0 ? fresh : all
}

export function pickSurprise(pool: readonly WorkoutTemplate[], random: () => number = Math.random): WorkoutTemplate | null {
  if (pool.length === 0) return null
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}

// The routine of her most recent finished workout that wasn't a draft:
// Complete offers a cool-down, so "the last thing done" is often that, and
// yesterday's main routine must still count as yesterday's.
export function lastMainTemplateId(
  plans: readonly { id: string; templateId: string }[],
  results: readonly { planId: string; endedAt: string }[],
  draftIds: ReadonlySet<string>
): string | null {
  const templateOf = new Map(plans.map((p) => [p.id, p.templateId]))
  const main = results
    .map((r) => ({ endedAt: r.endedAt, templateId: templateOf.get(r.planId) }))
    .filter((r): r is { endedAt: string; templateId: string } => r.templateId !== undefined && !draftIds.has(r.templateId))
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
  return main[0]?.templateId ?? null
}
