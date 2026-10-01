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
  // Real recent history Rae can call back to, for the ready/rest/done
  // states only (see raeMemory.ts). Optional: screens that haven't wired it
  // up yet just get the generic lines.
  memory?: RaeMemory
}

// What Rae might remember about recent workouts, built from history by
// raeMemory.ts. Everything here is about the past, never a judgment on
// today, so it is safe to show (or not show — see MEMORY_SHARE) on a rest
// or ready day too.
export type RaeMemory = {
  // The most recently finished session before today, if any.
  lastSession: {
    // Display name of the template that session ran, when known.
    templateName: string | null
    // The move to single out: its new best when it has one, else the move
    // with the most completed sets. Null when there's nothing to call out.
    standout: { exerciseName: string; isHold: boolean; isNewBest: boolean } | null
  } | null
  // The session before `lastSession` ran the same template.
  sameTemplateAsPrevious: boolean
  // The rarest (non-common) flower grown within the last few days, if any.
  recentRareFlower: { speciesName: string } | null
  // A hold/timed move the just-finished session beat its own best on
  // (the 'done' state's recap of what just happened).
  justBeatHold: { exerciseName: string } | null
}

export const EMPTY_RAE_MEMORY: RaeMemory = {
  lastSession: null,
  sameTemplateAsPrevious: false,
  recentRareFlower: null,
  justBeatHold: null,
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

// States eligible for a memory line: the moment-of-the-day lines, never the
// higher-priority ones (resume/first/welcomeBack) or the week-goal
// celebration (goalMet keeps its own spotlight).
const MEMORY_ELIGIBLE = new Set<keyof typeof RAE_LINES>(['done', 'rest', 'readyMorning', 'readyAfternoon', 'readyEvening'])

export function raeSays(input: RaeSaysInput): string {
  const category = state(input)
  if (MEMORY_ELIGIBLE.has(category) && input.memory) {
    const candidates = memoryCandidates(category, input.memory)
    if (candidates.length > 0 && useMemoryToday(input.dateKey)) {
      return pick(candidates, `${input.dateKey}:memory-pick`)
    }
  }
  return pick(RAE_LINES[category], input.dateKey)
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

// Roughly half the eligible days get a memory line instead of a generic
// one — enough to feel like Rae remembers, never so often it feels rote.
function useMemoryToday(dateKey: string): boolean {
  return hashStr(`${dateKey}:memory-gate`) % 2 === 0
}

function memoryCandidates(category: keyof typeof RAE_LINES, memory: RaeMemory): string[] {
  if (category === 'done') {
    const line = memory.justBeatHold && lineFor('hold', memory.justBeatHold.exerciseName)
    return line ? [line] : []
  }
  const lines: string[] = []
  const standout = memory.lastSession?.standout
  if (standout) {
    const kind = standout.isHold && standout.isNewBest ? 'hold' : 'standout'
    const line = lineFor(kind, standout.exerciseName)
    if (line) lines.push(line)
  }
  if (memory.sameTemplateAsPrevious && memory.lastSession?.templateName) {
    const line = lineFor('streak', memory.lastSession.templateName)
    if (line) lines.push(line)
  }
  if (memory.recentRareFlower) {
    const line = lineFor('flower', memory.recentRareFlower.speciesName)
    if (line) lines.push(line)
  }
  return lines
}

const MEMORY_TEMPLATES = {
  standout: { prefix: '', suffix: ' looked strong yesterday!' },
  hold: { prefix: 'You beat your ', suffix: ' time!' },
  streak: { prefix: 'Two days of ', suffix: ', nice rhythm.' },
  flower: { prefix: 'That ', suffix: ' is still glowing.' },
} as const satisfies Record<string, { prefix: string; suffix: string }>

// Builds one memory line, shortening the name to fit the 40-char bubble.
// Falls back to no line (the caller drops it, generic lines take over)
// rather than ever overflowing the bubble.
function lineFor(kind: keyof typeof MEMORY_TEMPLATES, name: string): string | null {
  const { prefix, suffix } = MEMORY_TEMPLATES[kind]
  const short = shorten(name, 40 - prefix.length - suffix.length)
  return short ? `${prefix}${short}${suffix}` : null
}

// Sensible shortening: fits as-is, else drops a parenthetical aside, else
// takes as many whole leading words as fit. Gives up (null) rather than
// cut a single word or leave something too short to read as a name.
function shorten(name: string, maxLen: number): string | null {
  const trimmed = name.trim()
  if (maxLen <= 0) return null
  if (trimmed.length <= maxLen) return trimmed
  const noAside = trimmed.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (noAside.length > 0 && noAside.length <= maxLen) return noAside
  const words = (noAside || trimmed).split(/\s+/)
  let out = ''
  for (const word of words) {
    const next = out ? `${out} ${word}` : word
    if (next.length > maxLen) break
    out = next
  }
  return out.length >= 3 ? out : null
}

function pick(lines: readonly string[], dateKey: string): string {
  return lines[hashStr(dateKey) % lines.length]
}

function hashStr(text: string): number {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}
