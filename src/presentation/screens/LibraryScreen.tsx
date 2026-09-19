import {
  exerciseById,
  foundationStrengthStarterPack,
  foundationStrengthStarterTemplates,
} from '../../domain/content/fixtures/foundationStrengthStarter'

export function LibraryScreen() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Library</h1>
      <p className="text-sm text-ink-muted">{foundationStrengthStarterPack.name}</p>
      {foundationStrengthStarterTemplates.map((template) => (
        <div key={template.id} className="rounded-panel border border-edge bg-surface p-4">
          <p className="font-semibold">{template.name}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {template.exercises.map((te) => {
              const exercise = exerciseById.get(te.exerciseId)
              const dose = te.prescription.reps
                ? `${te.prescription.sets} × ${te.prescription.reps}`
                : `${te.prescription.sets} × ${te.prescription.timeSeconds}s`
              return (
                <li key={te.exerciseId} className="flex justify-between gap-2">
                  <span>{exercise?.name ?? te.exerciseId}</span>
                  <span className="text-ink-muted">{dose}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
