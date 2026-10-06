import { useState } from 'react'
import { getTemplateName } from '../../domain/content/catalog'
import { speciesFor } from '../../domain/progress/garden'
import { projectSetRecords } from '../../domain/progress/history'
import { sessionHighlights } from '../../domain/progress/sessionHighlights'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { completeStats } from '../screens/completeStats'
import { buildCardModel, cardFilename, drawCard, type CardModel } from '../shareCard'
import { ShareIcon, loadRaeCheer, renderCardToBlob } from './ShareCardButton'
import { shareOrDownload } from './shareOrDownload'

// "Share" on the finish screen: paints this workout's card (shareCard.ts)
// and hands it to the share sheet (Messages, Instagram, Save Image), or
// downloads it where sharing files isn't supported. Everything stays on the
// device until the user picks where it goes.
export function ShareWorkoutButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleShare() {
    setBusy(true)
    setError(null)
    try {
      const { blob, filename } = await renderWorkoutCard(sessionId)
      await shareOrDownload(blob, filename, 'image/png')
    } catch {
      setError("Couldn't make the card on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" className="btn-secondary min-h-11 gap-2 px-5" onClick={handleShare} disabled={busy}>
        <ShareIcon />
        {busy ? 'Making your card…' : 'Share'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-ink-muted">
          {error}
        </p>
      )}
    </div>
  )
}

export async function renderWorkoutCard(sessionId: string): Promise<{ blob: Blob; filename: string; model: CardModel }> {
  const { plans, results, events } = await getAllSessionHistory()
  const result = results.find((r) => r.sessionId === sessionId)
  const plan = plans.find((p) => p.id === result?.planId)
  if (!result || !plan) throw new Error('Workout not found')
  const templateName = await getTemplateName(plan.templateId).catch(() => undefined)
  const sessionEvents = events.filter((e) => e.sessionId === sessionId)
  const highlights = sessionHighlights(projectSetRecords(plans, results, events), results, sessionId)
  const best = highlights.newBests[0]
  const highlight =
    best != null
      ? `New best: ${best.exerciseName}`
      : highlights.milestone != null
        ? highlights.milestone === 1
          ? 'My first workout!'
          : `${highlights.milestone} workouts!`
        : undefined
  const profileName = activeProfile().name
  const species = speciesFor(sessionId)
  const model = buildCardModel({
    workoutName: templateName ?? 'Workout',
    endedAt: result.endedAt,
    stats: completeStats(plan, result, sessionEvents),
    species,
    name: hasRealName(profileName) ? profileName.trim() : undefined,
    highlight,
  })

  // The app's own font, if it's loaded, and Rae's cheering image, loaded
  // and painted together via the shared card-rendering code.
  const rae = await loadRaeCheer()
  const blob = await renderCardToBlob((ctx) => drawCard(ctx, model, species, rae))
  return { blob, filename: cardFilename(result.endedAt), model }
}
