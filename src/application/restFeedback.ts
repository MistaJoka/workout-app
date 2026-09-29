// Timer feedback: a short two-tone chime (Web Audio) when a rest or hold
// ends, short ticks for its last three seconds, and a vibration pattern.
// The AudioContext is created/resumed only from a user gesture
// (primeAudio, called on the "Complete Set" / "Start" taps) and kept as a
// module singleton — iOS refuses to start audio otherwise.

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  return audioContext
}

// iOS 17+: a 'playback' audio session plays through the silent switch, so
// the chime is heard with the phone on the floor. Progressive enhancement.
function preferPlaybackSession(): void {
  if (typeof navigator === 'undefined') return
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (!session) return
  try {
    session.type = 'playback'
  } catch {
    // unsupported value on this engine; keep the default session
  }
}

export function primeAudio(): void {
  preferPlaybackSession()
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function tone(ctx: AudioContext, frequency: number, at: number, duration: number, peak = 0.25): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + duration)
}

export function playRestChime(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  tone(ctx, 660, now, 0.18)
  tone(ctx, 880, now + 0.2, 0.28)
}

// One short, quieter tick: the 3-2-1 before a rest or hold ends.
export function playCountdownTick(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  tone(ctx, 520, ctx.currentTime, 0.08, 0.15)
}

// iOS Safari has no navigator.vibrate, so a vibration setting does nothing
// there; screens can hide or relabel it with this.
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrateRestEnd(): void {
  if (canVibrate()) navigator.vibrate([200, 100, 200])
}

export function restEndFeedback(options: { sound: boolean; vibration: boolean }): void {
  if (options.sound) playRestChime()
  if (options.vibration) vibrateRestEnd()
}

// Seconds left at which a countdown ticks (the chime covers zero).
export const COUNTDOWN_TICKS: readonly number[] = [3, 2, 1]
