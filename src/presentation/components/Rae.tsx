// Rae, the Pixel Bloom coach. Every image here is cut straight from the
// canonical v1 character bible by scripts/assets/derive-rae-preview.py, so
// nothing is redrawn and she always looks like Rae.

import { raeLoopUrl, raeStillUrl } from './raeLoops'

export const RAE_EXPRESSIONS = [
  'neutral',
  'smile',
  'happy',
  'cheer',
  'focused',
  'determined',
  'tired',
  'surprised',
  'laugh',
  'wink',
] as const

export type RaeExpression = (typeof RAE_EXPRESSIONS)[number]

// Headshots are ~100x122 in the bible; keep that aspect when sizing.
const FACE_ASPECT = 122 / 100

type FaceProps = {
  expression: RaeExpression
  size?: number
  // 'bob' idles gently; 'pop' springs in once (celebrations). Both are
  // stripped by the app's reduced/off motion rules in index.css.
  motion?: 'bob' | 'pop' | 'none'
  // True when the caller swaps `expression` to react to something (pair it
  // with `key={expression}` so each change remounts the image): full motion
  // gets a tiny pop, reduced crossfades, off swaps instantly with no
  // animation at all (see MOOD_SWAP_STYLE).
  moodSwap?: boolean
  // The expression is flavor, not information (WorkoutPlayerScreen's own
  // text/timers already say what's happening), so it's hidden from
  // assistive tech when true.
  decorative?: boolean
  // Exposed as data-testid, for screens/tests that need this exact face.
  testId?: string
  className?: string
}

export function RaeFace({
  expression,
  size = 64,
  motion = 'bob',
  moodSwap = false,
  decorative = false,
  testId,
  className = '',
}: FaceProps) {
  const motionClass = motion === 'bob' ? 'rae-bob' : motion === 'pop' ? 'rae-pop' : ''
  return (
    <>
      {moodSwap && <style>{MOOD_SWAP_STYLE}</style>}
      <img
        src={`/rae/expr-${expression}.png`}
        alt={decorative ? '' : `Rae, ${expression}`}
        aria-hidden={decorative || undefined}
        data-expression={expression}
        data-testid={testId}
        width={size}
        height={Math.round(size * FACE_ASPECT)}
        className={`${motionClass} ${moodSwap ? 'rae-mood-swap' : ''} ${className}`}
        draggable={false}
      />
    </>
  )
}

// A mood-swap reaction, scoped to this component (CLAUDE.md: no index.css
// edits). Full motion gets a tiny spring; reduced gets a plain crossfade —
// its `!important` beats index.css's blanket reduced-motion duration clamp
// the same way RouteFade's own reduced fallback does, so it's a real fade
// rather than collapsing to the same instant swap as 'off'; 'off' gets no
// animation class at all, just the new <img> mount.
const MOOD_SWAP_STYLE = `
@keyframes rae-mood-pop {
  0% { transform: scale(0.7); opacity: 0.5; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes rae-mood-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
[data-motion='full'] .rae-mood-swap { animation: rae-mood-pop 260ms cubic-bezier(0.3, 1.6, 0.5, 1) both; }
[data-motion='reduced'] .rae-mood-swap { animation: rae-mood-fade 180ms ease-out both !important; }
`

type FigureProps = {
  view: 'front' | '3q'
  height?: number
}

export function RaeFigure({ view, height = 240 }: FigureProps) {
  const src = view === 'front' ? '/rae/full-front.png' : '/rae/full-3q.png'
  // Source sizes: front 133x434, 3/4 119x433 (hands included).
  const aspect = view === 'front' ? 133 / 434 : 119 / 433
  return (
    <img
      src={src}
      alt={view === 'front' ? 'Rae, front view' : 'Rae, three-quarter view'}
      height={height}
      width={Math.round(height * aspect)}
      className="rae-breathe"
      draggable={false}
    />
  )
}

type LoopProps = {
  // Built by scripts/assets/build-rae-frames.py into public/rae/<id>.*
  id: string
  name: string
  width: number
  height: number
  // Key frames shown side by side when motion is reduced/off, so the
  // movement stays fully visible without animation.
  stills: readonly number[]
  animate: boolean
  // Extra classes for each image, e.g. a max height in the workout player.
  imgClassName?: string
}

export function RaeExerciseLoop({ id, name, width, height, stills, animate, imgClassName = '' }: LoopProps) {
  if (animate) {
    return (
      <img
        src={raeLoopUrl(id)}
        alt={`Rae doing a ${name}`}
        width={width}
        height={height}
        className={`mx-auto h-auto max-w-full ${imgClassName}`}
      />
    )
  }
  return (
    <div className="flex justify-center gap-3">
      {stills.map((frame) => (
        <img
          key={frame}
          src={raeStillUrl(id, frame)}
          alt={`${name}, frame ${frame + 1}`}
          width={width}
          height={height}
          className={`h-auto min-w-0 flex-1 object-contain ${imgClassName}`}
          style={{ maxWidth: width }}
        />
      ))}
    </div>
  )
}
