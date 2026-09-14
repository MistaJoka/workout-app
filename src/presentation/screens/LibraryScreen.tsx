import { placeholderPack, placeholderTemplate } from '../../domain/content/fixtures/placeholderPack'

export function LibraryScreen() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Library</h1>
      <div className="rounded-panel border border-edge bg-surface p-4">
        <p className="font-semibold">{placeholderPack.name}</p>
        <ul className="mt-2 list-inside list-disc text-sm text-ink-muted">
          <li>
            {placeholderTemplate.name} — {placeholderTemplate.exercises.length} exercises
          </li>
        </ul>
      </div>
    </div>
  )
}
