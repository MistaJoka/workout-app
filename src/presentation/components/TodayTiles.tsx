import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// One square picture tile for the swipe rows on Today and Library: art, at
// most two words, an optional number. The visible words are short; `name`
// is the full accessible name, so nothing is lost to a screen reader.
export function TodayTile({
  to,
  name,
  short,
  art,
  value,
}: {
  to: string
  name: string
  short: string
  art: ReactNode
  value?: string
}) {
  return (
    <div role="listitem" className="flex flex-none">
      <Link
        to={to}
        aria-label={name}
        className="today-tile card flex w-24 flex-none flex-col items-center gap-1 p-2 text-center active:bg-field-primary"
      >
        <span aria-hidden className="flex h-12 items-center justify-center">
          {art}
        </span>
        <span aria-hidden className="line-clamp-2 w-full break-words text-xs font-bold leading-tight">
          {short}
        </span>
        {value && (
          <span aria-hidden className="hud-num text-xs text-ink-muted">
            {value}
          </span>
        )}
      </Link>
    </div>
  )
}

// A horizontal swipe row of tiles. It hides itself while none of its
// tiles render (each extra decides on its own, after loading).
export function TileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="list"
      aria-label={label}
      className="today-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]"
    >
      {children}
    </div>
  )
}
