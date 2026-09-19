import { useNavigate } from 'react-router-dom'

export function AboutScreen() {
  const navigate = useNavigate()
  return (
    <div className="p-4 space-y-4 text-sm">
      <button className="text-sm text-ink-muted" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <h1 className="text-xl font-bold">About</h1>
      <p>
        Foundation Strength is a private, offline-first workout app. Everything stays on this device; there is no
        account and nothing is sent anywhere.
      </p>

      <section className="space-y-1">
        <p className="font-semibold">Exercise content</p>
        <p className="text-ink-muted">
          Exercise names, instructions and photos come from the public-domain{' '}
          <span className="font-medium">free-exercise-db</span> dataset (yuhonas/free-exercise-db, Unlicense), which
          credits its imagery to wrkout/exercises.json. Prescriptions (sets, reps, rest) are conventional beginner
          defaults, not medical advice.
        </p>
      </section>

      <section className="space-y-1">
        <p className="font-semibold">Progression rules</p>
        <p className="text-ink-muted">
          The double-progression logic is an independent implementation informed by the behavior of{' '}
          <span className="font-medium">FitnessTrack</span> (Gman0909/FitnessTrack, MIT).
        </p>
      </section>

      <p className="text-xs text-ink-muted">
        Not a substitute for guidance from a qualified professional. Stop any movement that causes pain.
      </p>
    </div>
  )
}
