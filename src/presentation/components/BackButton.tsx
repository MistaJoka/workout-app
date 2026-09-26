import { useNavigate } from 'react-router-dom'

// A home-screen app has no browser back button, so every screen outside
// the tab bar needs its own way out. Goes back in history when there is
// somewhere to go back to (react-router keeps `idx` in history.state),
// otherwise to Today — a deep link never strands you.
export function BackButton({ label = 'Back' }: { label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="btn-ghost -ml-3"
      onClick={() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (idx > 0) navigate(-1)
        else navigate('/')
      }}
    >
      ‹ {label}
    </button>
  )
}
