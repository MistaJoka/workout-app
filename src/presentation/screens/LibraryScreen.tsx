import {
  foundationStrengthStarterExercises,
  foundationStrengthStarterPack,
  foundationStrengthStarterTemplate,
} from '../../domain/content/fixtures/foundationStrengthStarter'

export function LibraryScreen() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Library</h1>
      <div className="rounded-panel border border-edge bg-surface p-4">
        <p className="font-semibold">{foundationStrengthStarterPack.name}</p>
        <ul className="mt-2 list-inside list-disc text-sm text-ink-muted">
          <li>
            {foundationStrengthStarterTemplate.name} — {foundationStrengthStarterTemplate.exercises.length} exercises
          </li>
        </ul>
        <ul className="mt-3 space-y-1 text-sm">
          {foundationStrengthStarterExercises.map((exercise) => (
            <li key={exercise.id}>{exercise.name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
