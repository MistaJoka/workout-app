import { BackButton } from './BackButton'
import { RaeFace } from './Rae'

// The one not-found state for screens reached by id (a stale link, a
// home-screen shortcut, a deleted routine): Rae, one short line, and the
// usual way out (back one step, or Today on a deep link).
export function NotFound({ message, backLabel }: { message: string; backLabel?: string }) {
  return (
    <div className="p-4 space-y-4" data-testid="not-found">
      <BackButton label={backLabel} />
      <div className="flex flex-col items-center gap-3 pt-8 text-center">
        <RaeFace expression="surprised" size={96} motion="none" />
        <p className="font-bold">{message}</p>
      </div>
    </div>
  )
}
