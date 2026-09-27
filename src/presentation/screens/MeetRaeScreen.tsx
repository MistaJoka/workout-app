import { useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RAE_EXPRESSIONS, RaeFace, RaeFigure, type RaeExpression } from '../components/Rae'

export function MeetRaeScreen() {
  const [expression, setExpression] = useState<RaeExpression>('happy')

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

    </div>
  )
}
