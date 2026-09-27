import { useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RAE_EXPRESSIONS, RaeFace, RaeFigure, type RaeExpression } from '../components/Rae'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { useTheme } from '../theme/ThemeContext'

// Throwaway-spike renders registered as PROTOTYPE in asset-db; the real
// rig engine replaces them.
const MOTION_TESTS = [
  { id: 'squat', name: 'Squat', width: 140, height: 265, stills: [['start', 'standing'], ['bottom', 'bottom of the squat']] },
  { id: 'jumping-jack', name: 'Jumping jack', width: 120, height: 264, stills: [['start', 'start'], ['top', 'arms up']] },
] as const

export function MeetRaeScreen() {
  const [expression, setExpression] = useState<RaeExpression>('happy')
  const { motion } = useTheme()
  const animate = effectiveMotion(motion, usePrefersReducedMotion()) === 'full'

  function next() {
    const index = RAE_EXPRESSIONS.indexOf(expression)
    setExpression(RAE_EXPRESSIONS[(index + 1) % RAE_EXPRESSIONS.length])
  }

  return (
    <div className="p-4 space-y-4">
      <BackButton />
      <h1 className="text-xl font-bold">Meet Rae</h1>

      <section className="field-primary flex items-end justify-center gap-6 p-4">
        <RaeFigure view="front" height={220} />
        <RaeFigure view="3q" height={220} />
      </section>

      <section className="card space-y-3 p-4 text-center">
        <button type="button" onClick={next} className="mx-auto block" aria-label="Next expression">
          <RaeFace key={expression} expression={expression} size={132} motion="pop" />
        </button>
        <p className="font-semibold capitalize">{expression}</p>
        <div className="flex flex-wrap justify-center gap-1">
          {RAE_EXPRESSIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setExpression(e)}
              className={`rounded-full p-0.5 ${e === expression ? 'ring-2 ring-primary' : ''}`}
              aria-label={e}
              aria-pressed={e === expression}
            >
              <RaeFace expression={e} size={40} motion="none" />
            </button>
          ))}
        </div>
      </section>

      {MOTION_TESTS.map((test) => (
        <section key={test.id} className="field-info space-y-2 p-4 text-center">
          <p className="font-bold">{test.name}</p>
          {animate ? (
            <img
              src={`/rae/motion-${test.id}.webp`}
              alt={`Rae doing a ${test.name.toLowerCase()}`}
              width={test.width}
              height={test.height}
              className="pixelated mx-auto"
            />
          ) : (
            <div className="flex justify-center gap-4">
              {test.stills.map(([file, label]) => (
                <img
                  key={file}
                  src={`/rae/motion-${test.id}-${file}.png`}
                  alt={`${test.name}, ${label}`}
                  width={test.width}
                  height={test.height}
                  className="pixelated"
                />
              ))}
            </div>
          )}
        </section>
      ))}
      <p className="text-center text-sm text-ink-muted">Early motion tests. More moves are on the way.</p>
    </div>
  )
}
