import type { ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// A gentle fade-and-rise each time the route changes (`.route-enter` in
// index.css; motion reduced = fade only, off = none). Keyed on the path so a
// new screen, or the same screen with a new id, enters fresh. It animates
// opacity and margin only, never transform: a transformed ancestor would
// become the containing block for the screens' fixed ThumbBars, and they
// would jump for the length of the animation. Nothing blocks taps meanwhile.
export function RouteFade({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="route-enter">
      {children ?? <Outlet />}
    </div>
  )
}
