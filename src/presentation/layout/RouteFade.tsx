import { Suspense, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'

// A generic placeholder for a route-level React.lazy chunk that's still
// downloading (App.tsx lazy-imports the rarely-first screens). Most of the
// time this never renders — the service worker has the chunk precached —
// but it covers the first-ever navigation to a screen before the SW
// install finishes, or a cold cache. Shape-only, like every other Skeleton
// use; nothing screen-specific, since this boundary covers every route.
const ROUTE_FALLBACK = (
  <Skeleton className="space-y-4 p-4">
    <SkeletonHeading />
    <SkeletonBlock className="h-40 w-full rounded-panel" />
    <SkeletonBlock className="h-24 w-full rounded-panel" />
  </Skeleton>
)

// A gentle fade-and-rise each time the route changes (`.route-enter` in
// index.css; motion reduced = fade only, off = none). Keyed on the path so a
// new screen, or the same screen with a new id, enters fresh. It animates
// opacity and margin only, never transform: a transformed ancestor would
// become the containing block for the screens' fixed ThumbBars, and they
// would jump for the length of the animation. Nothing blocks taps meanwhile.
// `app-column` (index.css) clamps this to the centered phone-width column
// on screens wider than ~640px. This component is used both nested inside
// AppShell's own `app-column` (where the extra clamp is a no-op — already
// narrower) and standalone as the layout for full-screen flows
// (/checkin, /session, /recap), which have no AppShell wrapper of their
// own and so need the clamp here directly. Either way it adds no height:
// the full-screen flows' own screens already carry whatever
// min-height/background they need, and the plate behind the column
// (`body::before`) supplies the rest.
// The Suspense boundary sits here, inside the fading content, so a lazy
// route's chunk loading never unmounts AppShell's tab bar or a screen's
// ThumbBar — only the content above them placeholder-swaps.
export function RouteFade({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  return (
    // data-testid: a stable hook for e2e/large-screen.spec.ts to measure
    // the column's width/centering; not used for styling.
    <div key={pathname} className="route-enter app-column" data-testid="app-column">
      <Suspense fallback={ROUTE_FALLBACK}>{children ?? <Outlet />}</Suspense>
    </div>
  )
}
