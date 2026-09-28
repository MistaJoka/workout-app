import { useNavigate } from 'react-router-dom'

// A home-screen app has no browser back button, so every screen outside
// the tab bar needs its own way out. Goes back in history when there is
// somewhere to go back to (react-router keeps `idx` in history.state),
// otherwise to Today — a deep link never strands you. A screen with
// unsaved work passes `onBeforeBack` to ask first; it calls `goBack` to
// actually leave.
export function BackButton({
  label = 'Back',
  onBeforeBack,
}: {
  label?: string
  onBeforeBack?: (goBack: () => void) => void
}) {
  const navigate = useNavigate()
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/')
  }
  return (
    <button type="button" className="btn-ghost -ml-3" onClick={() => (onBeforeBack ? onBeforeBack(goBack) : goBack())}>
      ‹ {label}
    </button>
  )
}
