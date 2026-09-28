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
  className?: string
}

export function RaeFace({ expression, size = 64, motion = 'bob', className = '' }: FaceProps) {
  const motionClass = motion === 'bob' ? 'rae-bob' : motion === 'pop' ? 'rae-pop' : ''
  return (
    <img
      src={`/rae/expr-${expression}.png`}
      alt={`Rae, ${expression}`}
      width={size}
      height={Math.round(size * FACE_ASPECT)}
      className={`${motionClass} ${className}`}
      draggable={false}
    />
  )
}

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
