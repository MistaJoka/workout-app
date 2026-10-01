import { useState } from 'react'
import { getTemplate } from '../../domain/content/catalog'
import { speciesFor } from '../../domain/progress/garden'
import { projectSetRecords } from '../../domain/progress/history'
import { sessionHighlights } from '../../domain/progress/sessionHighlights'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { completeStats } from '../screens/completeStats'
import { CARD_HEIGHT, CARD_WIDTH, buildCardModel, cardFilename, drawCard, type CardModel } from '../shareCard'
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
  const template = await getTemplate(plan.templateId).catch(() => undefined)
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
    workoutName: template?.name ?? 'Workout',
    endedAt: result.endedAt,
    stats: completeStats(plan, result, sessionEvents),
    species,
    name: hasRealName(profileName) ? profileName.trim() : undefined,
    highlight,
  })

  // The app's own font, if it's loaded; the canvas falls back otherwise.
  await document.fonts?.load(`800 64px 'Nunito Variable'`).catch(() => undefined)
  const rae = await loadImage('/rae/expr-cheer.png').catch(() => null)

  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')
  drawCard(ctx, model, species, rae)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/png')
  )
  return { blob, filename: cardFilename(result.endedAt), model }
}

// Same-origin art only, so the canvas stays exportable.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load ${src}`))
    img.src = src
  })
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}
