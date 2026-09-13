'use client'

import { useEffect, useRef, useState } from 'react'

type TimerProps = {
  durationSeconds: number
  onComplete: () => void
}

export function Timer({ durationSeconds, onComplete }: TimerProps) {
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000)
  const endAtRef = useRef(Date.now() + durationSeconds * 1000)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    endAtRef.current = Date.now() + durationSeconds * 1000
    setRemainingMs(durationSeconds * 1000)

    const interval = setInterval(() => {
      const remaining = endAtRef.current - Date.now()
      if (remaining <= 0) {
        setRemainingMs(0)
        clearInterval(interval)
        playAlertSound()
        if (navigator.vibrate) navigator.vibrate(400)
        onCompleteRef.current()
      } else {
        setRemainingMs(remaining)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [durationSeconds])

  const seconds = Math.ceil(remainingMs / 1000)
  return (
    <div className="text-6xl font-bold tabular-nums text-center" role="timer">
      {formatTime(seconds)}
    </div>
  )
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    oscillator.frequency.value = 880
    oscillator.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not available; vibration/visual state is enough.
  }
}
