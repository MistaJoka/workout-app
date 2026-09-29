import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { discardSession, recordEvent } from '../../application/sessionService'
import { newId } from '../../shared/id'
import { ConfirmSheet } from './ConfirmSheet'

const SAVE_ERROR = "Couldn't save on this device. Try again."

// Under Today's Resume button: a workout left open can be finished as it
// stands (ended early, onto Complete, so its sets count) or thrown away.
// Both ask first. Discard is the only deletion of session data: an
// unfinished session never became history.
export function ResumeActions({ sessionId, onDiscarded }: { sessionId: string; onDiscarded: () => void }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', newId())
      navigate(`/session/${sessionId}/complete`, { replace: true })
    } catch {
      setError(SAVE_ERROR)
      setBusy(false)
    }
  }

  async function discard() {
    setBusy(true)
    setError(null)
    try {
      await discardSession(sessionId)
      setConfirm(null)
      setBusy(false)
      onDiscarded()
    } catch {
      setError(SAVE_ERROR)
      setBusy(false)
    }
  }

  function close() {
    if (busy) return
    setConfirm(null)
    setError(null)
  }

  return (
    <>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setConfirm('finish')}>
          Finish
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={() => setConfirm('discard')}>
          Discard
        </button>
      </div>
      {confirm === 'finish' && (
        <ConfirmSheet
          title="Finish this workout?"
          confirmLabel="Finish now"
          cancelLabel="Keep it open"
          busy={busy}
          error={error}
          onConfirm={() => void finish()}
          onCancel={close}
        >
          The sets you did count. It ends here.
        </ConfirmSheet>
      )}
      {confirm === 'discard' && (
        <ConfirmSheet
          title="Discard this workout?"
          confirmLabel="Discard"
          cancelLabel="Keep it"
          busy={busy}
          error={error}
          onConfirm={() => void discard()}
          onCancel={close}
        >
          It won't show in your history.
        </ConfirmSheet>
      )}
    </>
  )
}
