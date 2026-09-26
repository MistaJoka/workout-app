import { useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RAE_EXPRESSIONS, RaeFace, RaeFigure, type RaeExpression } from '../components/Rae'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { useTheme } from '../theme/ThemeContext'

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

      <section className="field-info space-y-2 p-4 text-center">
        <p className="font-bold">Jumping jack</p>
        {animate ? (
          <img
            src="/rae/motion-jumping-jack.webp"
            alt="Rae doing a jumping jack"
            width={120}
            height={264}
            className="pixelated mx-auto"
          />
        ) : (
          <div className="flex justify-center gap-4">
            <img src="/rae/motion-jumping-jack-start.png" alt="Jumping jack, start" width={120} height={264} className="pixelated" />
            <img src="/rae/motion-jumping-jack-top.png" alt="Jumping jack, arms up" width={120} height={264} className="pixelated" />
          </div>
        )}
        <p className="text-sm text-ink-muted">First motion test. More moves are on the way.</p>
      </section>
    </div>
  )
}
