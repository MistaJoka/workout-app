import type { DayPart } from './greeting'

// One short thing Rae says in her room on Today. Rae is a real person's
// avatar: warm, encouraging, never guilt-tripping, never nagging. Pure and
// deterministic: the same state on the same day always gives the same line,
// so it never flickers on re-render, and it varies from day to day.

export type RaeSaysInput = {
  mode: 'resume' | 'done' | 'rest' | 'ready'
  // Any workout ever finished on this profile.
  hasFinished: boolean
  // Whole local days since the last finished workout (0 = today), or null.
  daysSinceLast: number | null
  goalMet: boolean
  part: DayPart
  // Local YYYY-MM-DD, picks the day's variant.
  dateKey: string
}

// Away this long and Rae says it's good to see you (never "you missed...").
export const WELCOME_BACK_AFTER_DAYS = 4

export const RAE_LINES = {
  resume: ['Your workout is right where you left it.', 'Ready to pick up where we stopped?'],
  first: ["Hi! I'll show you every move.", "Let's start with something gentle."],
  welcomeBack: ['Good to see you. Let’s ease back in.', 'Welcome back. I saved you a spot.'],
  goalMet: ['Goal met this week. So proud of you!', "That's your week's goal. Beautiful."],
  done: ['Nice work today. Rest up.', 'You showed up today. That counts.'],
  rest: ['Rest day. Stretch if it feels good.', "Take it easy today. You've earned it."],
  readyMorning: ['Morning! Want to move together?', "A fresh start. I'm ready when you are."],
  readyAfternoon: ['Good time for a quick one?', "I'm warmed up when you are."],
  readyEvening: ['A little movement to end the day?', "Let's wind down with a short one."],
} as const satisfies Record<string, readonly string[]>

export function raeSays(input: RaeSaysInput): string {
  return pick(RAE_LINES[state(input)], input.dateKey)
}

function state(input: RaeSaysInput): keyof typeof RAE_LINES {
  if (input.mode === 'resume') return 'resume'
  if (!input.hasFinished) return 'first'
  if (input.mode === 'done') return input.goalMet ? 'goalMet' : 'done'
  if (input.daysSinceLast != null && input.daysSinceLast >= WELCOME_BACK_AFTER_DAYS) return 'welcomeBack'
  if (input.mode === 'rest') return 'rest'
  if (input.part === 'morning') return 'readyMorning'
  if (input.part === 'afternoon') return 'readyAfternoon'
  return 'readyEvening'
}

function pick(lines: readonly string[], dateKey: string): string {
  let hash = 0
  for (const ch of dateKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return lines[hash % lines.length]
}
