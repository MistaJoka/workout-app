import { BackButton } from '../components/BackButton'
import { SUPPORT_CONTACT } from '../legal/contact'

// Plain-language privacy policy. Every claim here is checked against the
// real code and docs/SECURITY_AND_PRIVACY.md — no account/analytics/
// telemetry, everything on-device in IndexedDB, the only network calls are
// the optional library-photo fetch and app updates. Keep this page in sync
// if that posture ever changes (docs/SECURITY_AND_PRIVACY.md "Privacy-
// preserving defaults" requires an explicit decision first).
const LAST_UPDATED = '2026-10-01'

export function PrivacyScreen() {
  return (
    <div className="p-4 space-y-4 text-sm">
      <BackButton />
      <h1 className="text-xl font-bold">Privacy policy</h1>
      <p className="text-xs text-ink-muted">Last updated {new Date(LAST_UPDATED).toLocaleDateString()}</p>

      <p>
        Foundation Strength is a private, offline-first workout app. There is no account, no sign-in, and no
        analytics or advertising trackers of any kind. This page explains, in plain language, what the app stores
        and the handful of times it talks to the network.
      </p>

      <section className="space-y-1">
        <h2 className="font-semibold">What's stored, and where</h2>
        <p className="text-ink-muted">
          Your workouts, routines, body weight, progress, and settings are stored only on this device, in your
          browser's IndexedDB storage. If this device has more than one profile, each profile's data lives in its
          own separate local database and never mixes with another profile's.
        </p>
        <p className="text-ink-muted">Nothing you do in the app is sent to us or to any third party. There is no server to send it to.</p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">The exercise photo fetch</h2>
        <p className="text-ink-muted">
          Some exercise library photos are fetched on demand from GitHub's media host (raw.githubusercontent.com)
          instead of being bundled into the app. When that happens, GitHub's servers receive the same information
          any web request reveals — your device's IP address and the file being requested — the same as loading an
          image from any website. That request never includes your workouts, name, or any other data from this
          app. Once fetched, a photo is cached on your device so it keeps working offline.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">App updates</h2>
        <p className="text-ink-muted">
          The app checks for new versions of itself so it can offer an update, the same way any website or PWA
          checks for a fresher version of its own files. That check doesn't include your workout data.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Backups</h2>
        <p className="text-ink-muted">
          You can save a backup of your data as a file from Settings whenever you choose — nothing is backed up
          automatically or sent anywhere on your behalf. A backup file contains your workouts, routines, and
          settings, so keep it as carefully as you'd keep that information in any other form. Importing a backup
          only adds data to the profile you choose; it's covered by in-app confirmation before anything changes.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Deleting your data</h2>
        <p className="text-ink-muted">
          You can erase everything for a profile at any time from Settings → Danger zone. That removes all local
          data for that profile from this device. Because there's no account or server copy, this is also the only
          copy — save a backup first if you might want it later.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Children</h2>
        <p className="text-ink-muted">
          Foundation Strength isn't directed at children and doesn't knowingly collect information from children.
          Because the app collects no information from anyone — it only stores what you type on your own device —
          there's no data about a child for us to have, see, or share.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Contact</h2>
        <p className="text-ink-muted">
          Questions about this policy or your data: <span className="font-medium">{SUPPORT_CONTACT}</span>.
        </p>
      </section>
    </div>
  )
}
