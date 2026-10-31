import { BackButton } from './BackButton'

// What a screen shows when its data couldn't be read: say so, offer a retry.
export function LoadFailed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="p-4 space-y-4">
      <BackButton />
      <p className="font-bold">Couldn't load {what}.</p>
      <button type="button" className="btn-primary w-full" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
