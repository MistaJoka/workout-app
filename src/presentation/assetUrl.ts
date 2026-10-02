// Resolves a static asset served from `public/` against the app's base
// path (Vite's `import.meta.env.BASE_URL`), so app code never hardcodes a
// root-absolute URL. Local and Capacitor builds have base '/' (BASE_URL
// '/'), so this is a no-op there; the GitHub Pages project build sets
// VITE_BASE_PATH (vite.config.ts) to '/workout-app/', and every asset must
// resolve under that prefix instead of 404ing at the real domain root.
//
// `path` is the asset's path under `public/`, with or without a leading
// slash (e.g. 'rae/expr-smile.png' or '/rae/expr-smile.png') — either way
// it is joined onto BASE_URL (which always ends in '/') exactly once.
//
// Some callers (exercise media: `src/domain/content/fixtures/*` keeps
// domain content framework-independent, so it never imports this) hand
// through a string that may already be a fully-qualified upstream URL
// (the free-exercise-db library's `raw.githubusercontent.com` photos) —
// those pass through unchanged rather than getting BASE_URL glued onto
// their scheme.
export function asset(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  const base = import.meta.env.BASE_URL
  const relative = path.startsWith('/') ? path.slice(1) : path
  return `${base}${relative}`
}
