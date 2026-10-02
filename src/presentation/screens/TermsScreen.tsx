import { BackButton } from '../components/BackButton'
import { SUPPORT_CONTACT } from '../legal/contact'

// Simple terms of use. The health disclaimer wording is copied verbatim
// from AboutScreen.tsx so the same promise appears everywhere it matters,
// rather than two slightly different versions drifting apart.
const LAST_UPDATED = '2026-10-01'

export function TermsScreen() {
  return (
    <div className="p-4 space-y-4 text-sm">
      <BackButton />
      <h1 className="text-xl font-bold">Terms of use</h1>
      <p className="text-xs text-ink-muted">Last updated {new Date(LAST_UPDATED).toLocaleDateString()}</p>

      <section className="space-y-1">
        <h2 className="font-semibold">Using the app</h2>
        <p className="text-ink-muted">
          Foundation Strength is provided for your personal use to plan and track workouts. All of your data stays
          on your device — see the <span className="font-medium">Privacy policy</span> for details. There's no
          account to create and nothing to agree to beyond this page.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Health disclaimer</h2>
        <p className="text-ink-muted">
          Prescriptions (sets, reps, rest) are conventional beginner defaults, not medical advice. Foundation
          Strength is not a substitute for guidance from a qualified professional. Stop any movement that causes
          pain. Talk to a doctor before starting a new exercise program, especially if you have an existing injury
          or health condition.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">No warranty, provided "as is"</h2>
        <p className="text-ink-muted">
          The app is provided "as is," without warranty of any kind, express or implied. We don't guarantee it will
          be error-free, uninterrupted, or fit for any particular purpose. You use it at your own risk, and you're
          responsible for backing up your own data (Settings → Save a backup).
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Content and licenses</h2>
        <p className="text-ink-muted">
          Exercise content and third-party software used by the app are credited on the{' '}
          <span className="font-medium">Open-source licenses</span> page.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Changes</h2>
        <p className="text-ink-muted">
          If these terms change, the date above will update. Continuing to use the app after a change means you
          accept the current terms.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Contact</h2>
        <p className="text-ink-muted">
          Questions about these terms: <span className="font-medium">{SUPPORT_CONTACT}</span>.
        </p>
      </section>
    </div>
  )
}
