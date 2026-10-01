// A small sound palette for the app's big celebratory moments: starting a
// workout, a bloom's species reveal, an achievement unlock, levelling up,
// and meeting the weekly goal. Synthesized with WebAudio (no audio files),
// soft and short (well under a second), and built from the same C-major
// pentatonic palette as restFeedback's set chime, so nothing startles and
// everything shares one voice.
//
// Note-sequence builders are pure and unit-tested; the WebAudio-playing
// half is thin and shares restFeedback's single AudioContext (so
// primeAudio's user-gesture unlock on iOS covers these too).

import { canVibrate, getAudioContext } from './restFeedback'

export type CelebrationKind = 'start' | 'bloom' | 'badge' | 'levelUp' | 'goalMet'

export type CelebrationOptions = {
  // 'bloom' only: a brighter, extra-sparkly take for a rare/legendary species.
  rare?: boolean
}

export type FeedbackGate = { sound: boolean; vibration: boolean }

export type Note = {
  frequency: number
  start: number // seconds after the sequence begins
  duration: number // seconds
  peak?: number // 0-1 gain, defaults to a soft 0.18
  type?: OscillatorType
}

// C-major pentatonic (C D E G A) across two octaves, matching
// restFeedback's PENTATONIC_STEPS/SET_BASE_HZ so the app's sounds agree.
const C5 = 523.25
const STEPS = [0, 2, 4, 7, 9]

function degree(n: number): number {
  const octave = Math.floor(n / STEPS.length)
  const step = STEPS[((n % STEPS.length) + STEPS.length) % STEPS.length]
  return C5 * 2 ** ((octave * 12 + step) / 12)
}

// Gentle whoosh-up: three rising notes, like a breath in before the first rep.
export function buildStartWhoosh(): Note[] {
  return [
    { frequency: degree(0), start: 0, duration: 0.1, peak: 0.12 },
    { frequency: degree(1), start: 0.07, duration: 0.12, peak: 0.16 },
    { frequency: degree(2), start: 0.15, duration: 0.22, peak: 0.2 },
  ]
}

// Sparkly chime for the flower reveal: an upward run, brighter and with two
// extra shimmer notes layered on top for a rare/legendary species.
export function buildBloomChime(rare = false): Note[] {
  const base: Note[] = [
    { frequency: degree(2), start: 0, duration: 0.16, peak: 0.16 },
    { frequency: degree(3), start: 0.09, duration: 0.18, peak: 0.18 },
    { frequency: degree(4), start: 0.18, duration: 0.3, peak: 0.2 },
  ]
  if (!rare) return base
  return [
    ...base,
    { frequency: degree(6), start: 0.22, duration: 0.28, peak: 0.12, type: 'triangle' },
    { frequency: degree(7), start: 0.32, duration: 0.32, peak: 0.14, type: 'triangle' },
  ]
}

// Two-note sparkle, "ding-ding", for an achievement unlock card.
export function buildBadgeSparkle(): Note[] {
  return [
    { frequency: degree(4), start: 0, duration: 0.14, peak: 0.18 },
    { frequency: degree(6), start: 0.1, duration: 0.22, peak: 0.2 },
  ]
}

// A short four-note fanfare for levelling up: the app's biggest moment,
// still comfortably under a second.
export function buildLevelUpFanfare(): Note[] {
  return [
    { frequency: degree(0), start: 0, duration: 0.14, peak: 0.18 },
    { frequency: degree(1), start: 0.1, duration: 0.14, peak: 0.18 },
    { frequency: degree(2), start: 0.2, duration: 0.14, peak: 0.2 },
    { frequency: degree(4), start: 0.3, duration: 0.42, peak: 0.24 },
  ]
}

// A warm major triad for meeting the weekly goal, all three notes together.
export function buildGoalMetChord(): Note[] {
  return [
    { frequency: degree(0), start: 0, duration: 0.5, peak: 0.14 },
    { frequency: degree(2), start: 0, duration: 0.5, peak: 0.12 },
    { frequency: degree(3), start: 0, duration: 0.5, peak: 0.11 },
  ]
}

export function buildCelebrationNotes(kind: CelebrationKind, opts?: CelebrationOptions): Note[] {
  switch (kind) {
    case 'start':
      return buildStartWhoosh()
    case 'bloom':
      return buildBloomChime(opts?.rare)
    case 'badge':
      return buildBadgeSparkle()
    case 'levelUp':
      return buildLevelUpFanfare()
    case 'goalMet':
      return buildGoalMetChord()
  }
}

// A short haptic to match each sound (Vibration setting, Android only: see
// restFeedback's canVibrate).
const HAPTIC_PATTERN: Record<CelebrationKind, number | number[]> = {
  start: 20,
  bloom: [15, 40, 25],
  badge: [20, 30, 20],
  levelUp: [30, 50, 30, 50, 60],
  goalMet: [40, 60, 40],
}

function playNotes(ctx: AudioContext, notes: Note[]): void {
  const now = ctx.currentTime
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = n.type ?? 'sine'
    osc.frequency.value = n.frequency
    const at = now + n.start
    const peak = n.peak ?? 0.18
    const attack = Math.min(0.03, n.duration / 3)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + n.duration + 0.02)
  }
}

// Plays one of the celebration sounds (Sound setting) with a matching short
// haptic (Vibration setting, where supported). Never blocks rendering and
// never throws: a missing or broken AudioContext/vibrate is swallowed, same
// as the rest of the app's progressive-enhancement feedback.
export function playCelebration(kind: CelebrationKind, gate: FeedbackGate, opts?: CelebrationOptions): void {
  try {
    if (gate.sound) {
      const ctx = getAudioContext()
      if (ctx) {
        if (ctx.state === 'suspended') void ctx.resume()
        playNotes(ctx, buildCelebrationNotes(kind, opts))
      }
    }
  } catch {
    // A missing celebration sound is never an error.
  }
  try {
    if (gate.vibration && canVibrate()) navigator.vibrate(HAPTIC_PATTERN[kind])
  } catch {
    // ditto
  }
}
