import { useRef, useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RAE_EXPRESSIONS, RaeExerciseLoop, RaeFace, RaeFigure, type RaeExpression } from '../components/Rae'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { useTheme } from '../theme/ThemeContext'
import { RAE_LOOPS } from '../components/raeLoops'

// Featured moves only (the library's hundreds live in the Library). One stage
// plays the chosen move; the rest are small tiles, grouped, so the page stays
// a couple of screens long instead of one full-size loop after another.
const FEATURED = RAE_LOOPS.filter((loop) => loop.featured)
const MOVE_GROUPS = ['Your workout moves', 'Chair and low-impact', 'More moves'] as const

export function MeetRaeScreen() {
  const [expression, setExpression] = useState<RaeExpression>('happy')
  const { motion } = useTheme()
  const animate = effectiveMotion(motion, usePrefersReducedMotion()) === 'full'
  const [selectedId, setSelectedId] = useState(FEATURED[0].id)
  const selected = FEATURED.find((loop) => loop.id === selectedId) ?? FEATURED[0]
  const stageRef = useRef<HTMLHeadingElement>(null)

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

      <h2 ref={stageRef} className="pt-2 text-lg font-bold">
        Moves
      </h2>
      <section className="field-info space-y-2 p-4 text-center" aria-live="polite">
        <p className="font-bold">{selected.name}</p>
        <RaeExerciseLoop
          key={selected.id}
          id={selected.id}
          name={selected.name.toLowerCase()}
          width={selected.width}
          height={selected.height}
          stills={selected.stills}
          animate={animate}
          imgClassName="max-h-[34vh] w-auto"
        />
      </section>

      {MOVE_GROUPS.map((group) => {
        const loops = FEATURED.filter((loop) => loop.group === group)
        if (loops.length === 0) return null
        return (
          <section key={group} className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">{group}</p>
            <div className="grid grid-cols-3 gap-2">
              {loops.map((loop) => (
                <button
                  key={loop.id}
                  type="button"
                  aria-pressed={loop.id === selected.id}
                  onClick={() => {
                    setSelectedId(loop.id)
                    stageRef.current?.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start' })
                  }}
                  className={`card flex flex-col items-center gap-1 p-2 ${loop.id === selected.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <img
                    src={`/rae/${loop.id}-${loop.stills[loop.stills.length - 1]}.png`}
                    alt=""
                    className="h-16 w-full object-contain"
                    loading="lazy"
                  />
                  <span className="line-clamp-2 text-center text-xs font-semibold leading-tight">{loop.name}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
