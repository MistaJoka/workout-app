import type { ReactNode } from 'react'

// A small ♥ in the corner of a tile's picture: marks Her mix, the routine
// made from her hearted moves. Decorative; the tile's name says it.
export function HeartBadge({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex">
      {children}
      <span aria-hidden="true" className="absolute -right-1 -top-1 text-sm text-primary">
        ♥
      </span>
    </span>
  )
}
