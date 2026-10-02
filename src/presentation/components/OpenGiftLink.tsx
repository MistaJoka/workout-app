import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractGiftLinkData } from '../../domain/rewards/giftLink'

// Her app can be the installed APK while Hubby Bunny's link is a web
// address: tapping it would open the browser's separate copy of the app.
// Pasting the link (or his whole message) here opens it in this app.
export function OpenGiftLink() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open() {
    const data = extractGiftLinkData(text)
    if (!data) {
      setError("That doesn't look like a gift link.")
      return
    }
    navigate(`/gift?d=${data}`)
  }

  return (
    <details className="card p-4" data-testid="open-gift-link">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">Got a link? Paste it here</summary>
      <div className="mt-3 space-y-2">
        <textarea
          className="input min-h-20 w-full"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          aria-label="Gift link"
          placeholder="Paste the link"
        />
        {error && (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn-primary min-h-11 w-full" onClick={open} disabled={!text.trim()}>
          Open link
        </button>
      </div>
    </details>
  )
}
