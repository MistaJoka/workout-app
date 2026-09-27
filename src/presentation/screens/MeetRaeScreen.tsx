import { useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RAE_EXPRESSIONS, RaeExerciseLoop, RaeFace, RaeFigure, type RaeExpression } from '../components/Rae'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { useTheme } from '../theme/ThemeContext'
import { RAE_LOOPS } from '../components/raeLoops'

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

      <h2 className="pt-2 text-lg font-bold">Moves</h2>
      {RAE_LOOPS.filter((loop) => loop.featured).map((loop) => (
        <section key={loop.id} className="field-info space-y-2 p-4 text-center">
          <p className="font-bold">{loop.name}</p>
          <RaeExerciseLoop
            id={loop.id}
            name={loop.name.toLowerCase()}
            width={loop.width}
            height={loop.height}
            stills={loop.stills}
            animate={animate}
          />
        </section>
      ))}
    </div>
  )
}
