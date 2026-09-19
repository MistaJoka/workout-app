// Rest-end feedback: a short two-tone chime (Web Audio) and a vibration
// pattern. The AudioContext is created/resumed only from a user gesture
// (primeAudio, called on the "Complete Set" tap) and kept as a module
// singleton — iOS refuses to start audio otherwise.

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  return audioContext
}

export function primeAudio(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export function playRestChime(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const tone = (frequency: number, at: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + duration)
  }
  const now = ctx.currentTime
  tone(660, now, 0.18)
  tone(880, now + 0.2, 0.28)
}

export function vibrateRestEnd(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([200, 100, 200])
  }
}

export function restEndFeedback(options: { sound: boolean; vibration: boolean }): void {
  if (options.sound) playRestChime()
  if (options.vibration) vibrateRestEnd()
}
