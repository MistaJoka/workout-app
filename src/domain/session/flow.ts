import { effectiveSetSlots } from './appliedEvents'
import type { SessionEvent, SessionPlan } from './types'

// Flow: the run of sets in a row that landed clean. A set counts as met
// unless its SET_COMPLETED payload says otherwise (met: false, from "No,
// fell short") — absent or true both mean met, matching every other reader
// of this payload (stats.ts's calculateVolume, lastTime.ts).
function isMet(event: SessionEvent): boolean {
  return event.payload.met !== false
}

export type FlowStatus = {
  // The counted sets landed in a row, most recent first, before the first
  // miss (or the start of the session). Resets quietly on a miss — nothing
  // here remembers *that* it reset, only where the run stands now.
  run: number
  // Every planned set counted, and every one of them met. effectiveSetSlots
  // already drops stray/undone sets, and a skipped move always leaves the
  // completed count short of the plan, so this needs no separate skip check.
  perfect: boolean
}

export function flowStatus(plan: SessionPlan, events: readonly SessionEvent[]): FlowStatus {
  const slots = effectiveSetSlots(plan, events)
  let run = 0
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    if (!isMet(slots[i].event)) break
    run += 1
  }
  const totalPlanned = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const perfect = totalPlanned > 0 && slots.length === totalPlanned && slots.every((slot) => isMet(slot.event))
  return { run, perfect }
}

// Milestones the flow chip celebrates: 3, 5, 8, 12, 17, 23 … each gap one
// set wider than the last, so the chip appears quickly but keeps finding a
// reason to escalate through a long clean streak.
function buildMilestones(limit: number): number[] {
  const milestones: number[] = []
  let value = 3
  let gap = 2
  while (value <= limit) {
    milestones.push(value)
    value += gap
    gap += 1
  }
  return milestones
}

const FLOW_MILESTONES = buildMilestones(1000)

export function isFlowMilestone(run: number): boolean {
  return FLOW_MILESTONES.includes(run)
}

// How many milestones the current run has passed (0 = no chip yet). Drives
// the chip's escalating sparkle: tier 1 at the first milestone, tier 2 at
// the second, and so on.
export function flowTier(run: number): number {
  let tier = 0
  for (const milestone of FLOW_MILESTONES) {
    if (run < milestone) break
    tier += 1
  }
  return tier
}
