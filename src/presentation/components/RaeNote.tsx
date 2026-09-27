import type { ReactNode } from 'react'
import { RaeFace, type RaeExpression } from './Rae'

// Rae saying one short thing: her face beside a speech bubble. The single
// pattern every screen uses when Rae reacts to something real (an empty
// list, a milestone, a choice), at most once per screen, so she reads as a
// companion rather than decoration. The words are HTML, never baked into
// art. Her face is decorative; the bubble carries the message.
export function RaeNote({
  expression,
  children,
  size = 56,
  className = '',
}: {
  expression: RaeExpression
  children: ReactNode
  size?: number
  className?: string
}) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <span aria-hidden className="flex-none">
        <RaeFace expression={expression} size={size} motion="none" />
      </span>
      <div className="rae-note__bubble min-w-0 flex-1 text-left text-sm">{children}</div>
    </div>
  )
}
