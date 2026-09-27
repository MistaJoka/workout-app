import { useEffect, useState } from 'react'
import { BackButton } from '../components/BackButton'
import { useTheme } from '../theme/ThemeContext'
import { requestPersistentStorage, storageStatusLabel, type StorageStatus } from '../pwa/storagePersistence'
import { RaeFace } from '../components/Rae'

export function AboutScreen() {
  const { motion, setMotion } = useTheme()
  const [storage, setStorage] = useState<StorageStatus>('unknown')

  useEffect(() => {
    requestPersistentStorage().then(setStorage)
  }, [])

  return (
    <div className="p-4 space-y-4 text-sm">
      <BackButton />
      <div className="flex items-center gap-3">
        <RaeFace expression="happy" size={56} motion="none" />
        <h1 className="text-xl font-bold">About</h1>
      </div>
      <p>
        Foundation Strength is a private, offline-first workout app. Everything stays on this device; there is no
        account and nothing is sent anywhere.
      </p>

      <section className="card space-y-1 p-3 text-ink-muted">
        <p>
          Version {__APP_VERSION__} ({__GIT_SHA__}), built {new Date(__BUILD_DATE__).toLocaleDateString()}
        </p>
        <p>{storageStatusLabel(storage)}</p>
      </section>

      {/* Moved here from Settings: most people never need it, and the
          phone's own reduce-motion setting is respected either way. Less and
          Off never hide information — photos show side by side instead. */}
      <section className="space-y-2">
        <p className="font-semibold">Animations</p>
        <div className="flex gap-2">
          {(
            [
              ['full', 'On'],
              ['reduced', 'Less'],
              ['off', 'Off'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={`chip ${motion === value ? 'chip-active' : ''}`}
              onClick={() => setMotion(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

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
